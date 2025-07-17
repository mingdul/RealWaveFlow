import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { Notification, NotificationContextType } from '../types/notification';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  // 미읽은 알림 개수 계산
  const unreadCount = notifications.filter(notification => !notification.read).length;

  useEffect(() => {
    // 사용자가 로그인한 경우에만 알림 소켓 연결 시도
    if (user) {
      initializeNotificationSocket();
    } else {
      // 로그아웃 시 소켓 연결 해제 및 알림 초기화
      disconnectNotificationSocket();
      clearNotifications();
    }

    // 컴포넌트 언마운트 시 소켓 정리
    return () => {
      disconnectNotificationSocket();
    };
  }, [user]);

  const initializeNotificationSocket = () => {
    try {
      // 알림 전용 소켓 연결 (/notifications 네임스페이스)
      const notificationSocket = io(
        `${import.meta.env.VITE_API_URL || 'http://13.125.231.115:8080'}/notifications`,
        {
          withCredentials: true, // 쿠키 전송 허용 (JWT 토큰 포함)
          autoConnect: true,
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        }
      );

      // 연결 성공
      notificationSocket.on('connect', () => {
        console.log('Notification socket connected:', notificationSocket.id);
      });

      // 연결 해제
      notificationSocket.on('disconnect', (reason) => {
        console.log('Notification socket disconnected:', reason);
      });

      // 알림 서비스 연결 확인
      notificationSocket.on('notification_connected', (data) => {
        console.log('Notification service connected:', data);
        showToast('success', '실시간 알림이 활성화되었습니다.');
      });

      // 새 알림 수신
      notificationSocket.on('notification', (notification: Notification) => {
        console.log('New notification received:', notification);
        addNotification(notification);
        
        // 토스트로 알림 표시
        showToast('info', `${notification.title}: ${notification.message}`, 5000);
      });

      // 연결 오류
      notificationSocket.on('connect_error', (error) => {
        console.error('Notification socket connection error:', error);
        
        if (error.message.includes('Unauthorized')) {
          showToast('error', '인증이 만료되었습니다. 다시 로그인해주세요.');
          logout();
        }
      });

      // 인증 실패
      notificationSocket.on('unauthorized', (data) => {
        console.log('Notification socket unauthorized:', data);
        showToast('error', '인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
      });

      // 재연결 시도
      notificationSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Notification socket reconnection attempt ${attemptNumber}`);
      });

      // 재연결 성공
      notificationSocket.on('reconnect', (attemptNumber) => {
        console.log(`Notification socket reconnected after ${attemptNumber} attempts`);
        showToast('success', '실시간 알림 연결이 복구되었습니다.');
      });

      // 재연결 실패
      notificationSocket.on('reconnect_failed', () => {
        console.log('Notification socket reconnection failed');
        showToast('warning', '실시간 알림 연결에 실패했습니다.');
      });

      setSocket(notificationSocket);
      
    } catch (error) {
      console.error('Failed to initialize notification socket:', error);
      showToast('error', '실시간 알림 연결에 실패했습니다.');
    }
  };

  const disconnectNotificationSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// 커스텀 훅
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 