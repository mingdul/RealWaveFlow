import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Socket, io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/useToast';
import notificationService from '../services/notificationService';

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
  userId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  socket: Socket | null;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  // 서버에서 기존 알림 로드
  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await notificationService.getUserNotifications();
      setNotifications(response);
      const unreadCount = response.filter(n => !n.isRead).length;
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      showToast('error', '알림을 불러오는데 실패했습니다.');
    }
  }, [user?.id, showToast]);

  // 알림 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // 소켓 초기화
  const initializeSocket = useCallback(() => {
    if (!user?.id || isConnecting) return;
    
    try {
      setIsConnecting(true);
      
      const baseUrl = import.meta.env.VITE_API_URL ? 
        import.meta.env.VITE_API_URL.replace('/api', '') : 
        'https://waveflow.pro';
      
      const newSocket = io(`${baseUrl}/notifications`, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      newSocket.on('connect', () => {
        console.log('🔔 [NotificationSocket] Connected, joining room for user:', user.id);
        newSocket.emit('join_user_room', { userId: user.id });
      });

      newSocket.on('notification', (notification: Notification) => {
        console.log('🔔 [NotificationSocket] Received notification:', notification);
        setNotifications(prev => {
          if (prev.some(n => n.id === notification.id)) {
            return prev;
          }
          return [notification, ...prev];
        });
      });

      newSocket.on('join_user_room_success', (data) => {
        console.log('🔔 [NotificationSocket] Successfully joined room:', data);
      });

      newSocket.on('join_user_room_error', (error) => {
        console.error('🔔 [NotificationSocket] Failed to join room:', error);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔔 [NotificationSocket] Disconnected:', reason);
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔔 [NotificationSocket] Connection error:', error);
        if (error.message.includes('Unauthorized')) {
          showToast('error', '인증이 만료되었습니다. 다시 로그인해주세요.');
          logout();
        }
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('🔔 [NotificationSocket] Initialization error:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [user?.id, user?.email, isConnecting, showToast, logout]);

  // 소켓 초기화 및 정리
  useEffect(() => {
    if (user?.id) {
      initializeSocket();
    }
    
    return () => {
      if (socket) {
        console.log('🔔 [NotificationSocket] Cleaning up socket connection');
        socket.disconnect();
        setSocket(null);
      }
    };
  }, [user?.id, initializeSocket]);

  // 기존 알림 로드
  useEffect(() => {
    if (user?.id) {
      refreshNotifications();
    }
  }, [user?.id, refreshNotifications]);

  // notifications 배열이 변경될 때마다 미읽은 알림 개수 업데이트
  useEffect(() => {
    const count = notifications.filter(n => !n.isRead).length;
    setUnreadCount(count);
  }, [notifications]);

  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    markAsRead,
    socket,
    refreshNotifications,
  }), [notifications, unreadCount, markAsRead, socket, refreshNotifications]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}; 