import { io, Socket } from 'socket.io-client';

interface SocketCallbacks {
  onConnect?: (data: any) => void;
  onDisconnect?: (reason: string) => void;
  onMessage?: (data: any) => void;
  onOnlineUsers?: (data: { count: number }) => void;
  onUnauthorized?: (data: { reason: string }) => void;
  onError?: (error: Error) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private callbacks: SocketCallbacks = {};
  private isConnecting = false;
  private currentUrl = '';

  constructor() {
    this.setupSocket();
  }

  // Socket.IO 클라이언트 설정 - 쿠키 포함 옵션
  private setupSocket() {
    if (this.socket) {
      return;
    }

    // 프로덕션 환경에서는 백엔드 서버 URL 사용
    // WebSocket은 백엔드와 같은 서버에서 실행되므로 /api 경로 포함해야 함
    this.currentUrl = import.meta.env.VITE_API_URL || 'https://waveflow.pro/api';
    
    console.log('🌐 [SocketService] Base URL:', this.currentUrl);
    console.log('🌐 [SocketService] VITE_API_URL:', import.meta.env.VITE_API_URL);
    
    console.log('🔌 [SocketService] Creating socket connection to:', this.currentUrl);
    
    this.socket = io(this.currentUrl, {
      withCredentials: true, // 쿠키 전송 허용 (JWT 토큰 포함)
      autoConnect: false, // 수동으로 연결 제어
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      forceNew: true, // 새로운 연결 강제
      timeout: 10000, // 연결 타임아웃 10초
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
    this.socket.on('online_users', (data) => {
      console.log('Online users:', data);
      this.callbacks.onOnlineUsers?.(data);
    });

    // 인증 실패 (토큰 만료 등)
    this.socket.on('unauthorized', (data) => {
      console.log('Unauthorized:', data);
      this.callbacks.onUnauthorized?.(data);
    });

    // 연결 오류
    this.socket.on('connect_error', (error) => {
      console.error('❌ [SocketService] Connection error:', error);
      console.error('❌ [SocketService] Error message:', error.message);
      console.error('❌ [SocketService] Attempted URL:', this.currentUrl);
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

  // 소켓 ID 반환
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // 소켓 이벤트 리스너 등록
  on(event: string, listener: (...args: any[]) => void) {
    if (!this.socket) {
      console.warn('Socket not initialized, cannot add listener for', event);
      return;
    }
    this.socket.on(event, listener);
  }

  // 소켓 이벤트 리스너 제거
  off(event: string, listener: (...args: any[]) => void) {
    if (!this.socket) {
      return;
    }
    this.socket.off(event, listener);
  }
}

// 싱글톤 인스턴스
const socketService = new SocketService();

export default socketService; 