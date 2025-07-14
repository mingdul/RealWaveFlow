import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  const { user, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();
  
  // Stem job status management
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

    const socketUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3000';
    
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
      showError(data.message || 'Duplicate file detected.');
    });

    newSocket.on('processing-approved', (data) => {
      console.log('Processing approved:', data);
      showSuccess(data.message || 'File processing approved.');
    });

    newSocket.on('file-processing-progress', (data) => {
      console.log('File processing progress:', data);
      // Progress update logic can be added here
    });

    newSocket.on('file-processing-completed', (data) => {
      console.log('File processing completed:', data);
      showSuccess(data.message || 'File processing completed.');
    });

    newSocket.on('file-processing-error', (data) => {
      console.log('File processing error:', data);
      showError(data.message || 'File processing error occurred.');
    });

    // Stem job completion event listeners (newly added)
    newSocket.on('stem-job-completed', (data) => {
      console.log('Stem job completed:', data);
      
      // Update stem job status
      setStemJobStatus(prev => ({
        ...prev,
        [data.stemId]: 'completed'
      }));
      
      // Add to completed stems list
      setCompletedStems(prev => {
        if (!prev.includes(data.stemId)) {
          return [...prev, data.stemId];
        }
        return prev;
      });
      
      // Remove from failed list (in case of retry success)
      setFailedStems(prev => prev.filter(id => id !== data.stemId));
      
      showSuccess(data.message || 'Stem job completed successfully.');
    });

    newSocket.on('stem-job-failed', (data) => {
      console.log('Stem job failed:', data);
      
      // Update stem job status
      setStemJobStatus(prev => ({
        ...prev,
        [data.stemId]: 'failed'
      }));
      
      // Add to failed stems list
      setFailedStems(prev => {
        if (!prev.includes(data.stemId)) {
          return [...prev, data.stemId];
        }
        return prev;
      });
      
      // Remove from completed list
      setCompletedStems(prev => prev.filter(id => id !== data.stemId));
      
      showError(data.message || 'Stem job failed.');
    });

    newSocket.on('all-stem-jobs-completed', (data) => {
      console.log('All stem jobs completed:', data);
      showSuccess(data.message || 'All stem jobs completed successfully.');
    });

    newSocket.on('forceLogout', (data) => {
      console.log('Force logout:', data);
      showError(data.reason || 'Session expired. Please login again.');
      // Logout handling logic needs to be added
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

  const sendMessage = (message: string) => {
    if (isConnected && socket) {
      socket.emit('message', { message });
    } else {
      showError('Connection lost. Cannot send messages.');
    }
  };

  const ping = () => {
    if (isConnected && socket) {
      socket.emit('ping');
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers: 0,
    socketId: undefined,
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