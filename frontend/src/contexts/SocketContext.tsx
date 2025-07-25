import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface SocketContextType {
  isConnected: boolean;
  onlineUsers: number;
  socketId: string | undefined;
  sendMessage: (message: string) => void;
  ping: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [socketId, setSocketId] = useState<string | undefined>();
  
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
    
    // 서버 종료나 네트워크 오류가 아닌 경우에만 토스트 표시
    if (reason && reason !== 'transport close' && reason !== 'ping timeout' && reason !== 'io client disconnect') {
      showToast('warning', '실시간 연결이 끊어졌습니다.');
    }
  };

  const handleMessage = (data: any) => {
    // 중요 메시지만 토스트로 표시
    if (data.type === 'IMPORTANT' && data.userId !== user?.id) {
      showToast('info', data.message);
    }
  };

  const handleOnlineUsers = (data: { count: number }) => {
    setOnlineUsers(data.count);
  };

  const handleUnauthorized = () => {
    showToast('error', '인증이 만료되었습니다. 다시 로그인해주세요.');
    logout();
  };

  const handleError = (error: Error) => {
    if (error.message.includes('Unauthorized')) {
      showToast('error', '인증이 만료되었습니다. 다시 로그인해주세요.');
      logout();
    }
  };

  const sendMessage = (message: string) => {
    if (!isConnected) {
      showToast('error', '연결이 끊어져 메시지를 보낼 수 없습니다.');
    } else {
      socketService.sendMessage(message);
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

  const value: SocketContextType = {
    isConnected,
    onlineUsers,
    socketId,
    sendMessage,
    ping,
    connect,
    disconnect,
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