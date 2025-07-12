import { io, Socket } from 'socket.io-client';

// 파일 처리 이벤트 타입들 (SocketContext와 동일)
interface FileDuplicateEvent {
  trackId: string;
  fileName: string;
  sessionId: string;
  originalFilePath: string;
  duplicateHash: string;
  timestamp: string;
  message: string;
}

interface ProcessingApprovedEvent {
  trackId: string;
  fileName: string;
  sessionId: string;
  stemHash: string;
  originalFilePath: string;
  timestamp: string;
  message: string;
}

interface FileProcessingProgressEvent {
  trackId: string;
  fileName: string;
  stage: 'hash_generated' | 'analysis_started' | 'analysis_completed' | 'processing_failed';
  progress: number;
  message?: string;
  timestamp: string;
}

interface FileProcessingCompletedEvent {
  trackId: string;
  fileName: string;
  result: any;
  processingTime: number;
  timestamp: string;
  message: string;
}

interface FileProcessingErrorEvent {
  trackId: string;
  fileName: string;
  error: string;
  stage: string;
  timestamp: string;
  message: string;
}

interface SocketCallbacks {
  onConnect?: (data: any) => void;
  onDisconnect?: (reason: string) => void;
  onMessage?: (data: any) => void;
  onOnlineUsers?: (data: { count: number }) => void;
  onUnauthorized?: (data: { reason: string }) => void;
  onError?: (error: Error) => void;
  
  // 파일 처리 이벤트 콜백들
  onFileDuplicate?: (event: FileDuplicateEvent) => void;
  onProcessingApproved?: (event: ProcessingApprovedEvent) => void;
  onFileProcessingProgress?: (event: FileProcessingProgressEvent) => void;
  onFileProcessingCompleted?: (event: FileProcessingCompletedEvent) => void;
  onFileProcessingError?: (event: FileProcessingErrorEvent) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private callbacks: SocketCallbacks = {};
  private isConnecting = false;

  constructor() {
    this.setupSocket();
  }

  // Socket.IO 클라이언트 설정 - 쿠키 포함 옵션
  private setupSocket() {
    if (this.socket) {
      return;
    }

    this.socket = io(import.meta.env.VITE_API_URL || 'http://13.125.231.115:8080', {
      withCredentials: true, // 쿠키 전송 허용 (JWT 토큰 포함)
      autoConnect: false, // 수동으로 연결 제어
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  // 이벤트 리스너 설정
  private setupEventListeners() {
    if (!this.socket) return;

    // 연결 성공
    this.socket.on('connect', () => {
      console.log('Socket.IO connected:', this.socket?.id);
      this.isConnecting = false;
      this.callbacks.onConnect?.(this.socket?.id);
    });

    // 연결 해제
    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      this.callbacks.onDisconnect?.(reason);
    });

    // 서버에서 연결 확인 메시지
    this.socket.on('connected', (data) => {
      console.log('Socket authenticated:', data);
      this.callbacks.onConnect?.(data);
    });

    // 메시지 수신
    this.socket.on('message', (data) => {
      console.log('Message received:', data);
      this.callbacks.onMessage?.(data);
    });

    // 온라인 사용자 수 업데이트
    this.socket.on('onlineUsers', (data) => {
      console.log('Online users:', data);
      this.callbacks.onOnlineUsers?.(data);
    });

    // 인증 실패 (토큰 만료 등)
    this.socket.on('forceLogout', (data) => {
      console.log('Force logout:', data);
      this.callbacks.onUnauthorized?.(data);
    });

    // 연결 오류
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnecting = false;
      this.callbacks.onError?.(error);
    });

    // 재연결 시도
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
    });

    // 재연결 성공
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
    });

    // 재연결 실패
    this.socket.on('reconnect_failed', () => {
      console.log('Reconnection failed');
    });

    // 핑 응답
    this.socket.on('pong', () => {
      console.log('Pong received');
    });

    // ===========================================
    // 파일 처리 이벤트 리스너들
    // ===========================================

    // 중복 파일 감지
    this.socket.on('file-duplicate', (event: FileDuplicateEvent) => {
      console.log('File duplicate event received:', event);
      this.callbacks.onFileDuplicate?.(event);
    });

    // 파일 처리 승인
    this.socket.on('processing-approved', (event: ProcessingApprovedEvent) => {
      console.log('Processing approved event received:', event);
      this.callbacks.onProcessingApproved?.(event);
    });

    // 파일 처리 진행 상태
    this.socket.on('file-processing-progress', (event: FileProcessingProgressEvent) => {
      console.log('File processing progress event received:', event);
      this.callbacks.onFileProcessingProgress?.(event);
    });

    // 파일 처리 완료
    this.socket.on('file-processing-completed', (event: FileProcessingCompletedEvent) => {
      console.log('File processing completed event received:', event);
      this.callbacks.onFileProcessingCompleted?.(event);
    });

    // 파일 처리 오류
    this.socket.on('file-processing-error', (event: FileProcessingErrorEvent) => {
      console.log('File processing error event received:', event);
      this.callbacks.onFileProcessingError?.(event);
    });
  }

  // 소켓 연결
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        this.setupSocket();
      }

      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // 이미 연결 중이면 대기
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve();
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      this.isConnecting = true;

      // 연결 성공 리스너
      const onConnect = () => {
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        resolve();
      };

      // 연결 실패 리스너
      const onError = (error: Error) => {
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        this.isConnecting = false;
        reject(error);
      };

      this.socket?.on('connect', onConnect);
      this.socket?.on('connect_error', onError);

      this.socket?.connect();
    });
  }

  // 소켓 연결 해제
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnecting = false;
    }
  }

  // 소켓 완전 제거
  destroy() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks = {};
    this.isConnecting = false;
  }

  // 메시지 전송
  sendMessage(message: string) {
    if (this.socket?.connected) {
      this.socket.emit('message', { message });
    } else {
      console.warn('Socket not connected');
    }
  }

  // 핑 전송
  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  // 콜백 등록
  setCallbacks(callbacks: SocketCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // 연결 상태 확인
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // 소켓 ID 가져오기
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// 싱글톤 인스턴스 export
export default new SocketService(); 