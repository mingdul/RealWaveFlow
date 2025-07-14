import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: number;
  socketId: string | undefined;
  sendMessage: (message: string) => void;
  ping: () => void;
  connect: () => void;
  disconnect: () => void;
  stemJobStatus: Record<string, 'pending' | 'completed' | 'failed'>;
  completedStems: string[];
  failedStems: string[];
  resetStemJobStatus: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [socketId, setSocketId] = useState<string | undefined>();
  
  const { user, logout, isAuthenticated } = useAuth();
  const { showToast, showSuccess, showError } = useToast();
  
  // 스템 작업 상태 관리
  const [stemJobStatus, setStemJobStatus] = useState<Record<string, 'pending' | 'completed' | 'failed'>>({});
  const [completedStems, setCompletedStems] = useState<string[]>([]);
  const [failedStems, setFailedStems] = useState<string[]>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user]);

  const connect = () => {
    if (!isAuthenticated || !user) {
      console.log('Socket connection skipped: User not authenticated');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('Socket connection skipped: No token found');
      return;
    }

    const socketUrl = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3000';
    
    const newSocket = io(socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('Socket authentication successful:', data);
    });

    // 파일 처리 이벤트 리스너들
    newSocket.on('file-duplicate', (data) => {
      console.log('File duplicate detected:', data);
      showError(data.message || '중복 파일이 감지되었습니다.');
    });

    newSocket.on('processing-approved', (data) => {
      console.log('Processing approved:', data);
      showSuccess(data.message || '파일 처리가 승인되었습니다.');
    });

    newSocket.on('file-processing-progress', (data) => {
      console.log('File processing progress:', data);
      // 진행 상태 업데이트 로직 추가 가능
    });

    newSocket.on('file-processing-completed', (data) => {
      console.log('File processing completed:', data);
      showSuccess(data.message || '파일 처리가 완료되었습니다.');
    });

    newSocket.on('file-processing-error', (data) => {
      console.log('File processing error:', data);
      showError(data.message || '파일 처리 중 오류가 발생했습니다.');
    });

    // 스템 작업 완료 이벤트 리스너들 (새로 추가)
    newSocket.on('stem-job-completed', (data) => {
      console.log('Stem job completed:', data);
      
      // 스템 작업 상태 업데이트
      setStemJobStatus(prev => ({
        ...prev,
        [data.stemId]: 'completed'
      }));
      
      // 완료된 스템 목록에 추가
      setCompletedStems(prev => {
        if (!prev.includes(data.stemId)) {
          return [...prev, data.stemId];
        }
        return prev;
      });
      
      // 실패 목록에서 제거 (재시도 성공 시)
      setFailedStems(prev => prev.filter(id => id !== data.stemId));
      
      showSuccess(data.message || '스템 작업이 완료되었습니다.');
    });

    newSocket.on('stem-job-failed', (data) => {
      console.log('Stem job failed:', data);
      
      // 스템 작업 상태 업데이트
      setStemJobStatus(prev => ({
        ...prev,
        [data.stemId]: 'failed'
      }));
      
      // 실패한 스템 목록에 추가
      setFailedStems(prev => {
        if (!prev.includes(data.stemId)) {
          return [...prev, data.stemId];
        }
        return prev;
      });
      
      // 완료 목록에서 제거
      setCompletedStems(prev => prev.filter(id => id !== data.stemId));
      
      showError(data.message || '스템 작업 중 오류가 발생했습니다.');
    });

    newSocket.on('all-stem-jobs-completed', (data) => {
      console.log('All stem jobs completed:', data);
      showSuccess(data.message || '모든 스템 작업이 완료되었습니다.');
    });

    newSocket.on('forceLogout', (data) => {
      console.log('Force logout:', data);
      showError(data.reason || '세션이 만료되었습니다. 다시 로그인해주세요.');
      // 로그아웃 처리 로직 추가 필요
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const resetStemJobStatus = () => {
    setStemJobStatus({});
    setCompletedStems([]);
    setFailedStems([]);
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

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    socketId,
    sendMessage,
    ping,
    connect,
    disconnect,
    stemJobStatus,
    completedStems,
    failedStems,
    resetStemJobStatus,
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