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

export interface NotificationPayload {
  id?: string;
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
  // 🔥 REMOVED: 메모리 기반 pending 시스템 제거 (DB 기반으로 대체)

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
      
      // 연결 성공 메시지 전송
      client.emit('notification_connected', {
        message: 'Successfully connected to notification service',
        userId: userId,
        socketId: client.id,
        joinedRoom: `user_${userId}`,
      });

      // 🔥 NEW: 연결 즉시 pending 알림 전송 (DB 기반)
      await this.sendPendingNotificationsFromDB(userId, client);
      
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

  // 🔥 NEW: 클라이언트가 명시적으로 룸 조인을 요청할 수 있는 이벤트 핸들러
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

      // 조인 후 pending 알림 전송
      await this.sendPendingNotificationsFromDB(userId, client);
      
    } catch (error) {
      this.logger.error('🔔 [NotificationGateway] Join room error:', error.message);
      client.emit('join_user_room_error', { message: 'Failed to join room' });
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

  // 🔥 IMPROVED: 특정 사용자에게 알림 전송 (연결 상태 확인 및 재시도 로직 추가)
  async sendNotificationToUser(userId: string, notification: NotificationPayload) {
    const userRoom = `user_${userId}`;
    const isUserConnected = this.connectedUsers.has(userId);
    
    // 연결된 사용자 목록 로그 추가
    const connectedUserIds = Array.from(this.connectedUsers.keys());
    this.logger.log(`🔔 [NotificationGateway] Connected users: [${connectedUserIds.join(', ')}]`);
    this.logger.log(`🔔 [NotificationGateway] Sending "${notification.title}" to user ${userId} (connected: ${isUserConnected})`);
    
    // 💾 DB에 pending 알림으로 저장 (delivered=false)
    let savedNotification: any;
    try {
      savedNotification = await this.notificationService.createPendingNotification(userId, notification);
      this.logger.log(`📦 [NotificationGateway] Pending notification saved to DB with ID: ${savedNotification.id}`);
    } catch (error) {
      this.logger.error(`📦 [NotificationGateway] Failed to save pending notification to DB: ${error.message}`);
      return; // DB 저장 실패 시 웹소켓 전송도 하지 않음
    }
    
    // 알림 전송 (DB에서 생성된 ID 포함)
    const notificationWithId = {
      ...notification,
      id: savedNotification.id,
    };

    if (isUserConnected) {
      // 🔥 연결된 사용자에게 즉시 전송
      try {
        this.server.to(userRoom).emit('notification', notificationWithId);
        
        // 전송 성공 시 delivered=true로 업데이트
        await this.notificationService.markAsDelivered([savedNotification.id]);
        
        this.logger.log(`📦 [NotificationGateway] ✅ Notification sent via websocket to room: ${userRoom} and marked as delivered`);
      } catch (error) {
        this.logger.error(`📦 [NotificationGateway] Websocket send error: ${error.message}`);
        // 전송 실패 시에는 delivered=false로 유지 (나중에 재전송 가능)
      }
    } else {
      // 🔥 연결되지 않은 사용자의 경우 DB에 pending으로 남겨둠
      this.logger.log(`📦 [NotificationGateway] ⏳ User not connected, notification remains pending in DB: ${userId}`);
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

  // 🔥 NEW: DB에서 pending 알림 조회 및 전송
  private async sendPendingNotificationsFromDB(userId: string, client: Socket) {
    try {
      // DB에서 미전송(pending) 알림 조회
      const pendingNotifications = await this.notificationService.getPendingNotifications(userId);
      
      if (pendingNotifications && pendingNotifications.length > 0) {
        this.logger.log(`📦 [NotificationGateway] Sending ${pendingNotifications.length} pending notifications from DB to user ${userId}`);
        
        const sentNotificationIds: string[] = [];
        
        for (const notification of pendingNotifications) {
          const notificationPayload: NotificationPayload = {
            id: notification.id,
            type: notification.type as any,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            timestamp: notification.created_at.toISOString(),
            read: notification.read,
          };
          
          try {
            client.emit('notification', notificationPayload);
            sentNotificationIds.push(notification.id);
            this.logger.log(`📦 [NotificationGateway] ✅ Sent pending notification: ${notification.id}`);
          } catch (emitError) {
            this.logger.error(`📦 [NotificationGateway] ❌ Failed to emit notification ${notification.id}: ${emitError.message}`);
          }
        }
        
        // 성공적으로 전송된 알림들을 delivered=true로 업데이트
        if (sentNotificationIds.length > 0) {
          await this.notificationService.markAsDelivered(sentNotificationIds);
          this.logger.log(`📦 [NotificationGateway] ✅ Marked ${sentNotificationIds.length} notifications as delivered`);
        }
      } else {
        this.logger.log(`📦 [NotificationGateway] No pending notifications for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`📦 [NotificationGateway] Error sending pending notifications from DB: ${error.message}`);
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