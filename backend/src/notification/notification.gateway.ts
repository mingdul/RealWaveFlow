import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { NotificationService } from './notification.service';

export interface NotificationPayload {
  id: string;
  type: 'stage_created' | 'upstream_created' | 'upstream_completed' | 'upstream_reviewed' | 'track_approved';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

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
  handleConnection(client: Socket) {
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
      
      this.logger.log(`🔔 [NotificationGateway] User connected: ${client.data.user?.email}`);
      
      // 연결 성공 메시지 전송
      client.emit('notification_connected', {
        message: 'Successfully connected to notification service',
        userId: userId,
        socketId: client.id,
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

  // 특정 사용자에게 알림 전송
  async sendNotificationToUser(userId: string, notification: NotificationPayload) {
    const userRoom = `user_${userId}`;
    const isUserConnected = this.connectedUsers.has(userId);
    
    this.logger.log(`🔔 [NotificationGateway] Sending "${notification.title}" to user (connected: ${isUserConnected})`);
    
    // 💾 DB에 알림 저장
    try {
      await this.notificationService.createNotification(userId, notification);
      this.logger.log(`🔔 [NotificationGateway] Notification saved to DB`);
    } catch (error) {
      this.logger.error(`🔔 [NotificationGateway] Failed to save to DB: ${error.message}`);
    }
    
    // 알림 전송
    try {
      this.server.to(userRoom).emit('notification', notification);
      this.logger.log(`🔔 [NotificationGateway] Notification sent via websocket`);
    } catch (error) {
      this.logger.error(`🔔 [NotificationGateway] Websocket send error: ${error.message}`);
    }
  }

  // 여러 사용자에게 알림 전송
  async sendNotificationToUsers(userIds: string[], notification: NotificationPayload) {
    const promises = userIds.map(userId => 
      this.sendNotificationToUser(userId, notification)
    );
    await Promise.all(promises);
  }

  // 트랙의 모든 사용자에게 알림 전송 (소유자 + 협업자)
  sendNotificationToTrack(trackId: string, notification: NotificationPayload) {
    const trackRoom = `track_${trackId}`;
    this.server.to(trackRoom).emit('notification', notification);
    this.logger.log(`Notification sent to track ${trackId}: ${notification.title}`);
  }

  // 스테이지의 모든 리뷰어에게 알림 전송
  sendNotificationToStageReviewers(stageId: string, notification: NotificationPayload) {
    const stageRoom = `stage_reviewers_${stageId}`;
    this.server.to(stageRoom).emit('notification', notification);
    this.logger.log(`Notification sent to stage reviewers ${stageId}: ${notification.title}`);
  }

  // 사용자를 트랙 룸에 조인
  joinTrackRoom(userId: string, trackId: string) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.join(`track_${trackId}`);
      this.logger.log(`User ${userId} joined track room ${trackId}`);
    }
  }

  // 사용자를 스테이지 리뷰어 룸에 조인
  joinStageReviewerRoom(userId: string, stageId: string) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.join(`stage_reviewers_${stageId}`);
      this.logger.log(`User ${userId} joined stage reviewer room ${stageId}`);
    }
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