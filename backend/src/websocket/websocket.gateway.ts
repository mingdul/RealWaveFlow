import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

// Socket.IO 서버 설정 - CORS 및 쿠키 지원
@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173', // Vite 개발 서버
      'http://localhost:3000', // React 개발 서버
      process.env.FRONTEND_URL || 'http://13.125.231.115:3000',
      'http://13.125.231.115:3000', // EC2 프론트엔드 URL
    ],
    credentials: true, // 쿠키 전송 허용
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'], // 전송 방법 설정
  allowEIO3: true, // Socket.IO 호환성
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, Socket>(); // user_id -> Socket 매핑

  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  // 게이트웨이 초기화
  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    // 소켓 연결 전 JWT 인증 미들웨어
    server.use(async (socket, next) => {
      try {
        const token = this.extractTokenFromSocket(socket);
        
        if (!token) {
          this.logger.error('JWT token not found in socket connection');
          return next(new Error('Unauthorized - No token provided'));
        }

        // JWT 토큰 검증
        const payload = this.jwtService.verify(token);
        
        // 사용자 정보 조회 - UsersService의 findById 메서드 사용
        const user = await this.usersService.findById(payload.sub);
        
        if (!user) {
          this.logger.error(`User not found for ID: ${payload.sub}`);
          return next(new Error('Unauthorized - User not found'));
        }

        // 소켓 객체에 사용자 정보 저장
        socket.data.user = user;
        socket.data.userId = user.id;
        
        this.logger.log(`Socket authenticated for user: ${user.id}`);
        next();
      } catch (error) {
        this.logger.error('Socket authentication failed:', error.message);
        next(new Error('Unauthorized - Invalid token'));
      }
    });
  }

  // 클라이언트 연결 시 처리
  handleConnection(client: Socket) {
    try {
      const userId = client.data.userId;
      
      if (!userId) {
        this.logger.error('User ID not found in socket data');
        client.disconnect();
        return;
      }

      // 기존 연결이 있다면 해제 (중복 연결 방지)
      if (this.connectedUsers.has(userId)) {
        const existingSocket = this.connectedUsers.get(userId);
        existingSocket.disconnect();
        this.logger.log(`Disconnected existing socket for user: ${userId}`);
      }

      // 새로운 연결 저장
      this.connectedUsers.set(userId, client);
      
      // 사용자 전용 룸에 조인
      client.join(`user_${userId}`);
      
      this.logger.log(
        `Client connected: ${client.id} for user: ${userId}`,
      );
      
      // 연결 성공 메시지 전송
      client.emit('connected', {
        message: 'Successfully connected to WebSocket',
        userId: userId,
        socketId: client.id,
      });

      // 온라인 사용자 수 업데이트
      this.broadcastOnlineUsers();
      
    } catch (error) {
      this.logger.error('Error handling connection:', error.message);
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
        
        this.logger.log(
          `Client disconnected: ${client.id} for user: ${userId}`,
        );
        
        // 온라인 사용자 수 업데이트
        this.broadcastOnlineUsers();
      }
    } catch (error) {
      this.logger.error('Error handling disconnect:', error.message);
    }
  }

  // 소켓에서 JWT 토큰 추출
  private extractTokenFromSocket(socket: Socket): string | null {
    try {
      // 쿠키에서 토큰 추출 (jwt 키 사용)
      const cookies = socket.handshake.headers.cookie;
      
      if (cookies) {
        // 쿠키 파싱: 더 정확한 방식으로 파싱
        const parsedCookies = this.parseCookies(cookies);
        
        // 먼저 'jwt' 키로 시도
        if (parsedCookies.jwt) {
          this.logger.log('JWT token found in cookie');
          return parsedCookies.jwt;
        }
        
        // fallback으로 'token' 키로 시도
        if (parsedCookies.token) {
          this.logger.log('Token found in cookie');
          return parsedCookies.token;
        }
      }

      // Authorization 헤더에서 토큰 추출 (fallback)
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        this.logger.log('Token found in Authorization header');
        return authHeader.substring(7);
      }

      this.logger.warn('No JWT token found in socket handshake');
      return null;
    } catch (error) {
      this.logger.error('Error extracting token from socket:', error.message);
      return null;
    }
  }

  // 쿠키 문자열을 객체로 파싱
  private parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    if (!cookieString) return cookies;
    
    cookieString.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name && rest.length > 0) {
        cookies[name] = rest.join('='); // = 문자가 값에 포함된 경우 처리
      }
    });
    
    return cookies;
  }

  // 온라인 사용자 수 브로드캐스트
  private broadcastOnlineUsers() {
    const onlineCount = this.connectedUsers.size;
    this.broadcast('onlineUsers', { count: onlineCount });
  }

  // 특정 사용자에게 메시지 전송
  sendToUser(userId: string, event: string, data: any) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit(event, data);
      this.logger.log(`Sent ${event} to user: ${userId}`);
    } else {
      this.logger.warn(`User ${userId} not connected`);
    }
  }

  // 사용자 룸에 메시지 전송
  sendToUserRoom(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  // 모든 연결된 클라이언트에게 브로드캐스트
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  // ===========================================
  // 파일 처리 이벤트 관련 메서드들 (새로 추가)
  // ===========================================

  /**
   * 중복 파일 감지 시 클라이언트에게 알림
   * @param userId 사용자 ID
   * @param data 중복 파일 정보
   */
  sendFileDuplicateEvent(userId: string, data: {
    trackId: string;
    fileName: string;
    stageId: string;
    originalFilePath: string;
    duplicateHash: string;
  }) {
    this.logger.log(`Sending file-duplicate event to user: ${userId} for file: ${data.fileName}`);
    this.sendToUser(userId, 'file-duplicate', {
      trackId: data.trackId,
      fileName: data.fileName,
      stageId: data.stageId,
      originalFilePath: data.originalFilePath,
      duplicateHash: data.duplicateHash,
      timestamp: new Date().toISOString(),
      message: `'${data.fileName}' file is duplicate and was not processed.`
    });
  }

  /**
   * 파일 처리 승인 시 클라이언트에게 알림
   * @param userId 사용자 ID
   * @param data 처리 승인 정보
   */
  sendProcessingApprovedEvent(userId: string, data: {
    trackId: string;
    stemHash: string;
    stageId: string;
    fileName: string;
    originalFilePath: string;
  }) {
    this.logger.log(`Sending processing-approved event to user: ${userId} for file: ${data.fileName}`);
    this.sendToUser(userId, 'processing-approved', {
      trackId: data.trackId,
      stemHash: data.stemHash,
      stageId: data.stageId,
      fileName: data.fileName,
      originalFilePath: data.originalFilePath,
      timestamp: new Date().toISOString(),
      message: `'${data.fileName}' file processing approved.`
    });
  }

  /**
   * 파일 처리 진행 상태 업데이트
   * @param userId 사용자 ID
   * @param data 진행 상태 정보
   */
  sendFileProcessingProgress(userId: string, data: {
    trackId: string;
    fileName: string;
    stage: 'hash_generated' | 'analysis_started' | 'analysis_completed' | 'processing_failed';
    progress: number;
    message?: string;
  }) {
    this.logger.log(`Sending file-processing-progress event to user: ${userId} for file: ${data.fileName}, stage: ${data.stage}`);
    this.sendToUser(userId, 'file-processing-progress', {
      trackId: data.trackId,
      fileName: data.fileName,
      stage: data.stage,
      progress: data.progress,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 파일 처리 완료 알림
   * @param userId 사용자 ID
   * @param data 완료 정보
   */
  sendFileProcessingCompleted(userId: string, data: {
    trackId: string;
    fileName: string;
    result: any;
    processingTime: number;
  }) {
    this.logger.log(`Sending file-processing-completed event to user: ${userId} for file: ${data.fileName}`);
    this.sendToUser(userId, 'file-processing-completed', {
      trackId: data.trackId,
      fileName: data.fileName,
      result: data.result,
      processingTime: data.processingTime,
      timestamp: new Date().toISOString(),
      message: `'${data.fileName}' file processing completed.`
    });
  }

  /**
   * 파일 처리 오류 알림
   * @param userId 사용자 ID
   * @param data 오류 정보
   */
  sendFileProcessingError(userId: string, data: {
    trackId: string;
    fileName: string;
    error: string;
    stage: string;
  }) {
    this.logger.error(`Sending file-processing-error event to user: ${userId} for file: ${data.fileName}`);
    this.sendToUser(userId, 'file-processing-error', {
      trackId: data.trackId,
      fileName: data.fileName,
      error: data.error,
      stage: data.stage,
      timestamp: new Date().toISOString(),
      message: `'${data.fileName}' file processing error occurred.`
    });
  }

  // ===========================================
  // 스템 작업 완료 이벤트 관련 메서드들 (새로 추가)
  // ===========================================

  /**
   * 스템 작업 완료 시 클라이언트에게 알림
   * @param userId 사용자 ID
   * @param data 스템 작업 완료 정보
   */
  sendStemJobCompleted(userId: string, data: {
    stemId: string;
    trackId: string;
    stageId: string;
    fileName: string;
    stemHash: string;
    audioWavePath?: string;
  }) {
    this.logger.log(`Sending stem-job-completed event to user: ${userId} for file: ${data.fileName}`);
    this.sendToUser(userId, 'stem-job-completed', {
      stemId: data.stemId,
      trackId: data.trackId,
      stageId: data.stageId,
      fileName: data.fileName,
      stemHash: data.stemHash,
      audioWavePath: data.audioWavePath,
      timestamp: new Date().toISOString(),
      message: `'${data.fileName}' stem job completed.`
    });
  }

  /**
   * 스템 작업 실패 시 클라이언트에게 알림
   * @param userId 사용자 ID
   * @param data 스템 작업 실패 정보
   */
  sendStemJobFailed(userId: string, data: {
    stemId: string;
    trackId: string;
    stageId: string;
    fileName: string;
    error: string;
  }) {
    this.logger.log(`Sending stem-job-failed event to user: ${userId} for file: ${data.fileName}`);
    this.sendToUser(userId, 'stem-job-failed', {
      stemId: data.stemId,
      trackId: data.trackId,
      stageId: data.stageId,
      fileName: data.fileName,
      error: data.error,
      timestamp: new Date().toISOString(),
      message: `'${data.fileName}' stem job failed.`
    });
  }

  /**
   * 모든 스템 작업 완료 시 클라이언트에게 알림
   * @param userId 사용자 ID
   * @param data 모든 스템 작업 완료 정보
   */
  sendAllStemJobsCompleted(userId: string, data: {
    trackId: string;
    stageId: string;
    completedStems: Array<{
      stemId: string;
      fileName: string;
      stemHash: string;
    }>;
  }) {
    this.logger.log(`Sending all-stem-jobs-completed event to user: ${userId} for stage: ${data.stageId}`);
    this.sendToUser(userId, 'all-stem-jobs-completed', {
      trackId: data.trackId,
      stageId: data.stageId,
      completedStems: data.completedStems,
      timestamp: new Date().toISOString(),
      message: `All stem jobs completed! (${data.completedStems.length} files)`
    });
  }

  // ===========================================
  // 기존 메서드들 유지
  // ===========================================

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): string {
    this.logger.log(`Ping received from ${client.id}`);
    return 'pong';
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: { message: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const userId = client.data.userId;
    
    this.logger.log(`Message from user ${userId}: ${data.message}`);
    
    // 메시지를 모든 클라이언트에게 브로드캐스트
    this.broadcast('message', {
      userId: userId,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  }

  // 강제 로그아웃 (토큰 만료 등)
  forceLogout(userId: string, reason: string = 'Token expired') {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit('forceLogout', { reason });
      socket.disconnect();
      this.logger.log(`Force logout for user: ${userId}, reason: ${reason}`);
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