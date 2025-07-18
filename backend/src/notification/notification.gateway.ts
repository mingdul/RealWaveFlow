import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { NotificationService } from './notification.service';

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: [
      'http://localhost:5173', // Vite 개발 서버
      'http://localhost:3000', // React 개발 서버
      'https://waveflow.pro', // 프로덕션 URL
      'http://13.125.231.115:3000', // EC2 프론트엔드 URL (백업)
      process.env.FRONTEND_URL || 'https://waveflow.pro',
    ],
    credentials: true, // 쿠키 전송 허용
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger(NotificationGateway.name);
  private connectedUsers = new Map<string, Socket>(); // user_id -> Socket 매핑

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private notificationService: NotificationService,
  ) {}

  // 게이트웨이 초기화
  afterInit(server: Server) {
    this.logger.log('🔔 [NotificationGateway] Gateway initialized');
    
    // 소켓 연결 전 JWT 인증 미들웨어
    server.use(async (socket, next) => {
      try {
        const token = this.extractTokenFromSocket(socket);
        
        if (!token) {
          this.logger.error('🔔 [NotificationGateway] No JWT token found');
          return next(new Error('Unauthorized - No token provided'));
        }

        // JWT 토큰 검증
        const payload = this.jwtService.verify(token);
        
        // 사용자 정보 조회
        const user = await this.usersService.findById(payload.sub);
        
        if (!user) {
          this.logger.error(`🔔 [NotificationGateway] User not found: ${payload.sub}`);
          return next(new Error('Unauthorized - User not found'));
        }

        // 소켓 객체에 사용자 정보 저장
        socket.data.user = user;
        socket.data.userId = user.id;
        
        this.logger.log(`🔔 [NotificationGateway] User authenticated: ${user.email}`);
        next();
      } catch (error) {
        this.logger.error('🔔 [NotificationGateway] Authentication failed:', error.message);
        next(new Error('Unauthorized - Invalid token'));
      }
    });
  }

  // 클라이언트 연결 시 처리
  async handleConnection(client: Socket) {
    try {
      const userId = client.data.userId;
      
      if (!userId) {
        this.logger.error('🔔 [NotificationGateway] No user ID in socket data');
        client.disconnect();
        return;
      }

      // 기존 연결이 있다면 해제 (중복 연결 방지)
      if (this.connectedUsers.has(userId)) {
        const existingSocket = this.connectedUsers.get(userId);
        existingSocket.disconnect();
      }

      // 새로운 연결 저장
      this.connectedUsers.set(userId, client);
      
      // 사용자 전용 룸에 조인
      client.join(`user_${userId}`);
      
      this.logger.log(`🔔 [NotificationGateway] User connected: ${client.data.user?.email} (Room: user_${userId})`);
      
      // 조용히 연결 완료 알림
      client.emit('notification_connected', {
        message: 'Connected to notification service',
        userId: userId,
        socketId: client.id,
        joinedRoom: `user_${userId}`,
        silent: true,
      });
      
    } catch (error) {
      this.logger.error('🔔 [NotificationGateway] Connection error:', error.message);
      client.disconnect();
    }
  }

  // 클라이언트 연결 해제 시 처리
  handleDisconnect(client: Socket) {
    try {
      const userId = client.data.userId;
      
      if (userId) {
        // 연결된 사용자 목록에서 제거
        this.connectedUsers.delete(userId);
        this.logger.log(`🔔 [NotificationGateway] User disconnected: ${client.data.user?.email}`);
      }
    } catch (error) {
      this.logger.error('🔔 [NotificationGateway] Disconnect error:', error.message);
    }
  }

  // 룸 조인 이벤트 핸들러
  @SubscribeMessage('join_user_room')
  async handleJoinUserRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      
      if (!userId || userId !== data.userId) {
        this.logger.error('🔔 [NotificationGateway] Invalid user ID for room join');
        client.emit('join_user_room_error', { message: 'Invalid user ID' });
        return;
      }

      // 룸 조인 (이미 조인되어 있어도 안전)
      client.join(`user_${userId}`);
      
      this.logger.log(`🔔 [NotificationGateway] User explicitly joined room: user_${userId}`);
      
      // 조인 성공 확인
      client.emit('join_user_room_success', { 
        message: 'Successfully joined user room',
        room: `user_${userId}`,
        userId: userId 
      });
      
    } catch (error) {
      this.logger.error('🔔 [NotificationGateway] Join room error:', error.message);
      client.emit('join_user_room_error', { message: 'Failed to join room' });
    }
  }

  // 특정 사용자에게 알림 전송
  async sendNotificationToUser(userId: string, type: string, message: string, data?: any) {
    const isUserConnected = this.connectedUsers.has(userId);
    
    this.logger.log(`🔔 [NotificationGateway] Sending "${type}" to user ${userId} (connected: ${isUserConnected})`);
    
    // DB에 알림 저장
    let savedNotification;
    try {
      savedNotification = await this.notificationService.create(userId, type, message, data);
      this.logger.log(`🔔 [NotificationGateway] Notification saved to DB with ID: ${savedNotification.id}`);
    } catch (error) {
      this.logger.error(`🔔 [NotificationGateway] Failed to save to DB: ${error.message}`);
      return;
    }
    
    // 소켓으로 실시간 전송 (연결된 경우에만)
    if (isUserConnected) {
      try {
        const payload = {
          id: savedNotification.id,
          userId: savedNotification.userId,
          type: savedNotification.type,
          message: savedNotification.message,
          data: savedNotification.data,
          isRead: savedNotification.isRead,
          createdAt: savedNotification.createdAt,
        };
        
        this.server.to(`user_${userId}`).emit('notification', payload);
        this.logger.log(`🔔 [NotificationGateway] ✅ Notification sent via websocket to user_${userId}`);
      } catch (error) {
        this.logger.error(`🔔 [NotificationGateway] Websocket send error: ${error.message}`);
      }
    } else {
      this.logger.log(`🔔 [NotificationGateway] ⏳ User not connected, notification saved to DB: ${userId}`);
    }
  }

  // 여러 사용자에게 알림 전송
  async sendNotificationToUsers(userIds: string[], type: string, message: string, data?: any) {
    this.logger.log(`🔔 [NotificationGateway] Sending notification to ${userIds.length} users: "${type}"`);
    
    const promises = userIds.map(userId => 
      this.sendNotificationToUser(userId, type, message, data)
    );
    await Promise.all(promises);
    
    this.logger.log(`🔔 [NotificationGateway] ✅ Notification sent to all ${userIds.length} users`);
  }

  // 소켓에서 JWT 토큰 추출
  private extractTokenFromSocket(socket: Socket): string | null {
    try {
      // 쿠키에서 토큰 추출
      const cookies = socket.handshake.headers.cookie;
      
      if (cookies) {
        const parsedCookies = this.parseCookies(cookies);
        
        if (parsedCookies.jwt) {
          this.logger.log('JWT token found in notification socket cookie');
          return parsedCookies.jwt;
        }
        
        if (parsedCookies.token) {
          this.logger.log('Token found in notification socket cookie');
          return parsedCookies.token;
        }
      }

      // Authorization 헤더에서 토큰 추출 (fallback)
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        this.logger.log('Token found in notification socket Authorization header');
        return authHeader.substring(7);
      }

      this.logger.warn('No JWT token found in notification socket handshake');
      return null;
    } catch (error) {
      this.logger.error('Error extracting token from notification socket:', error.message);
      return null;
    }
  }

  // 쿠키 파싱 유틸리티
  private parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    if (cookieString) {
      cookieString.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          cookies[name] = decodeURIComponent(value);
        }
      });
    }
    
    return cookies;
  }

  // 연결된 사용자 목록 반환
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // 특정 사용자 연결 상태 확인
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
} 