import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

// 파일 처리 이벤트 타입 정의
interface FileProcessingEvent {
  trackId: string;
  fileName: string;
  sessionId: string;
  timestamp: string;
  message: string;
}

interface FileDuplicateEvent extends FileProcessingEvent {
  originalFilePath: string;
  duplicateHash: string;
}

interface ProcessingApprovedEvent extends FileProcessingEvent {
  stemHash: string;
  originalFilePath: string;
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

// 파일 처리 이벤트 핸들러 타입
type FileProcessingHandlers = {
  onFileDuplicate?: (event: FileDuplicateEvent) => void;
  onProcessingApproved?: (event: ProcessingApprovedEvent) => void;
  onFileProcessingProgress?: (event: FileProcessingProgressEvent) => void;
  onFileProcessingCompleted?: (event: FileProcessingCompletedEvent) => void;
  onFileProcessingError?: (event: FileProcessingErrorEvent) => void;
};

interface SocketContextType {
  isConnected: boolean;
  onlineUsers: number;
  socketId: string | undefined;
  sendMessage: (message: string) => void;
  ping: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // 파일 처리 이벤트 핸들러 등록
  setFileProcessingHandlers: (handlers: FileProcessingHandlers) => void;
  clearFileProcessingHandlers: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [socketId, setSocketId] = useState<string | undefined>();
  const [fileProcessingHandlers, setFileProcessingHandlersState] = useState<FileProcessingHandlers>({});
  
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    // 사용자가 로그인한 경우에만 소켓 연결 시도
    if (user) {
      initializeSocket();
    } else {
      // 로그아웃 시 소켓 연결 해제
      handleDisconnect();
    }

    // 컴포넌트 언마운트 시 소켓 정리
    return () => {
      socketService.destroy();
    };
  }, [user]);

  const initializeSocket = async () => {
    try {
      // 소켓 이벤트 콜백 설정
      socketService.setCallbacks({
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
        onMessage: handleMessage,
        onOnlineUsers: handleOnlineUsers,
        onUnauthorized: handleUnauthorized,
        onError: handleError,
        
        // 파일 처리 이벤트 콜백 추가
        onFileDuplicate: handleFileDuplicate,
        onProcessingApproved: handleProcessingApproved,
        onFileProcessingProgress: handleFileProcessingProgress,
        onFileProcessingCompleted: handleFileProcessingCompleted,
        onFileProcessingError: handleFileProcessingError,
      });

      // 소켓 연결 시도
      await socketService.connect();
      console.log('Socket connection successful');
      
    } catch (error) {
      console.error('Socket connection failed:', error);
      showToast('error', 'Failed to connect to the server.');
    }
  };

  const handleConnect = (data: any) => {
    setIsConnected(true);
    setSocketId(socketService.getSocketId());
    
    if (data?.userId) {
      console.log('Socket authenticated for user:', data.userId);
      showToast('success', 'Real-time connection established.');
    }
  };

  const handleDisconnect = (reason?: string) => {
    setIsConnected(false);
    setSocketId(undefined);
    
    if (reason) {
      console.log('Socket disconnected:', reason);
      
      // 서버 종료나 네트워크 오류가 아닌 경우에만 토스트 표시
      if (reason !== 'transport close' && reason !== 'ping timeout') {
        showToast('warning', 'Real-time connection lost.');
      }
    }
  };

  const handleMessage = (data: any) => {
    console.log('Received message:', data);
    
    // 메시지 수신 시 토스트 표시 (선택사항)
    if (data.userId !== user?.id) {
      showToast('info', `New message: ${data.message}`);
    }
  };

  const handleOnlineUsers = (data: { count: number }) => {
    setOnlineUsers(data.count);
  };

  const handleUnauthorized = (data: { reason: string }) => {
    console.log('Socket unauthorized:', data.reason);
    showToast('error', 'Authentication expired. Please log in again.');
    
    // 토큰 만료 시 자동 로그아웃
    logout();
  };

  const handleError = (error: Error) => {
    console.error('Socket error:', error);
    
    // 연결 오류 시 토스트 표시
    if (error.message.includes('Unauthorized')) {
      showToast('error', 'Authentication failed. Please log in again.');
      logout();
    } else {
      showToast('error', 'Connection error occurred.');
    }
  };

  // ===========================================
  // 파일 처리 이벤트 핸들러들
  // ===========================================

  const handleFileDuplicate = (event: FileDuplicateEvent) => {
    console.log('File duplicate detected:', event);
    
    // 기본 토스트 표시
    showToast('warning', `중복 파일 감지: ${event.fileName}. ${event.message}`, 5000);
    
    // 등록된 핸들러 호출
    if (fileProcessingHandlers.onFileDuplicate) {
      fileProcessingHandlers.onFileDuplicate(event);
    }
  };

  const handleProcessingApproved = (event: ProcessingApprovedEvent) => {
    console.log('File processing approved:', event);
    
    // 기본 토스트 표시
    showToast('success', `파일 처리 승인: ${event.fileName}. ${event.message}`, 3000);
    
    // 등록된 핸들러 호출
    if (fileProcessingHandlers.onProcessingApproved) {
      fileProcessingHandlers.onProcessingApproved(event);
    }
  };

  const handleFileProcessingProgress = (event: FileProcessingProgressEvent) => {
    console.log('File processing progress:', event);
    
    // 진행 상태에 따른 토스트 표시
    const stageMessages = {
      hash_generated: '해시 생성 완료',
      analysis_started: '오디오 분석 시작',
      analysis_completed: '오디오 분석 완료',
      processing_failed: '처리 실패',
    };
    
    showToast('info', `${event.fileName}: ${stageMessages[event.stage]} - ${event.message || `진행률: ${event.progress}%`}`, 2000);
    
    // 등록된 핸들러 호출
    if (fileProcessingHandlers.onFileProcessingProgress) {
      fileProcessingHandlers.onFileProcessingProgress(event);
    }
  };

  const handleFileProcessingCompleted = (event: FileProcessingCompletedEvent) => {
    console.log('File processing completed:', event);
    
    // 완료 토스트 표시
    showToast('success', `처리 완료: ${event.fileName} - ${event.message} (소요시간: ${event.processingTime}ms)`, 4000);
    
    // 등록된 핸들러 호출
    if (fileProcessingHandlers.onFileProcessingCompleted) {
      fileProcessingHandlers.onFileProcessingCompleted(event);
    }
  };

  const handleFileProcessingError = (event: FileProcessingErrorEvent) => {
    console.error('File processing error:', event);
    
    // 오류 토스트 표시
    showToast('error', `처리 오류: ${event.fileName} - ${event.message} (단계: ${event.stage})`, 6000);
    
    // 등록된 핸들러 호출
    if (fileProcessingHandlers.onFileProcessingError) {
      fileProcessingHandlers.onFileProcessingError(event);
    }
  };

  // ===========================================
  // 기존 메서드들
  // ===========================================

  const sendMessage = (message: string) => {
    if (isConnected) {
      socketService.sendMessage(message);
    } else {
      showToast('error', 'Connection lost. Cannot send messages.');
    }
  };

  const ping = () => {
    if (isConnected) {
      socketService.ping();
    }
  };

  const connect = async () => {
    if (user && !isConnected) {
      await initializeSocket();
    }
  };

  const disconnect = () => {
    socketService.disconnect();
  };

  // 파일 처리 핸들러 관리
  const setFileProcessingHandlers = (handlers: FileProcessingHandlers) => {
    setFileProcessingHandlersState(handlers);
  };

  const clearFileProcessingHandlers = () => {
    setFileProcessingHandlersState({});
  };

  const value: SocketContextType = {
    isConnected,
    onlineUsers,
    socketId,
    sendMessage,
    ping,
    connect,
    disconnect,
    setFileProcessingHandlers,
    clearFileProcessingHandlers,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// 커스텀 훅
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// 파일 처리 이벤트 타입들을 export
export type {
  FileDuplicateEvent,
  ProcessingApprovedEvent,
  FileProcessingProgressEvent,
  FileProcessingCompletedEvent,
  FileProcessingErrorEvent,
  FileProcessingHandlers,
}; 