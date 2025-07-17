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
  console.log('🔔 [NotificationProvider] 🎬 COMPONENT MOUNTED');
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  
  console.log('🔔 [NotificationProvider] 🎭 COMPONENT RENDERED - User:', user ? `${user.id} (${user.email})` : 'null');

  // 미읽은 알림 개수 계산
  const unreadCount = notifications.filter(notification => !notification.read).length;

  console.log('🔔 [NotificationProvider] 🎯 Rendering - User:', user ? `${user.id} (${user.email})` : 'null');
  console.log('🔔 [NotificationProvider] 🔌 Socket state:', socket ? `connected (ID: ${socket.id})` : 'disconnected');
  console.log('🔔 [NotificationProvider] 📊 Notifications count:', notifications.length);
  console.log('🔔 [NotificationProvider] 🔍 Environment VITE_API_URL:', import.meta.env.VITE_API_URL);

  useEffect(() => {
    console.log('🔔 [NotificationProvider] 🚀 useEffect triggered - User changed:', user ? `${user.id} (${user.email})` : 'null');
    console.log('🔔 [NotificationProvider] 🚀 Current socket state before cleanup:', socket ? `connected (ID: ${socket.id})` : 'disconnected');
    
    // 기존 소켓이 있다면 정리
    const currentSocket = socket;
    if (currentSocket) {
      console.log('🔔 [NotificationProvider] 🧹 Cleaning up existing socket...', currentSocket.id);
      currentSocket.disconnect();
      setSocket(null);
    }

    if (user) {
      console.log('🔔 [NotificationProvider] 👤 User found, initializing notification socket...');
      console.log('🔔 [NotificationProvider] 👤 User details:', { id: user.id, email: user.email });
      
      // 약간의 지연 후 소켓 연결 (cleanup 완료 보장)
      const timer = setTimeout(() => {
        console.log('🔔 [NotificationProvider] ⏰ Timer triggered - calling initializeNotificationSocket');
        initializeNotificationSocket();
      }, 100);
      
      return () => {
        console.log('🔔 [NotificationProvider] 🧹 Cleanup: clearing timer and disconnecting socket');
        clearTimeout(timer);
        if (currentSocket) {
          currentSocket.disconnect();
        }
      };
    } else {
      console.log('🔔 [NotificationProvider] ❌ No user, clearing notifications...');
      setNotifications([]);
    }
  }, [user]);  // user만 dependency로 유지

  const initializeNotificationSocket = () => {
    console.log('🔔 [NotificationSocket] 🎬 initializeNotificationSocket CALLED');
    try {
      // Socket.IO는 자동으로 /socket.io/ 경로를 추가하므로 base URL만 사용
      const baseUrl = import.meta.env.VITE_API_URL ? 
        import.meta.env.VITE_API_URL.replace('/api', '') : 
        'https://waveflow.pro';
      
      console.log('🔔 [NotificationSocket] 🌐 Base URL:', baseUrl);
      console.log('🔔 [NotificationSocket] 👤 User:', user);
      console.log('🔔 [NotificationSocket] 🎯 User ID for socket auth:', user?.id);
      console.log('🔔 [NotificationSocket] 📧 User email:', user?.email);
      console.log('🔔 [NotificationSocket] 📄 Full user object:', JSON.stringify(user, null, 2));
      console.log('🔔 [NotificationSocket] 🔗 Full connection URL:', `${baseUrl}/notifications`);
      
      // 알림 전용 소켓 연결 (/notifications 네임스페이스)
      console.log('🔔 [NotificationSocket] 🔨 Creating socket instance...');
      const notificationSocket = io(`${baseUrl}/notifications`, {
        withCredentials: true, // 쿠키 전송 허용 (JWT 토큰 포함)
        autoConnect: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
      });
      
      console.log('🔔 [NotificationSocket] ✅ Socket instance created successfully');
      console.log('🔔 [NotificationSocket] 🔌 Initial connection state:', notificationSocket.connected);
      console.log('🔔 [NotificationSocket] 🆔 Socket ID (initial):', notificationSocket.id || 'not assigned yet');

      // 🔥 모든 이벤트 리스너 등록 (강화된 로깅)
      notificationSocket.onAny((eventName: string, ...args: any[]) => {
        console.log(`📡 [Socket] Event received: ${eventName}`, args);
        
        // 🔥 특별히 인증 관련 이벤트 상세 로깅
        if (eventName === 'authenticated' || eventName === 'unauthorized') {
          console.log(`🔐 [Socket] Auth event details:`, {
            event: eventName,
            args: args,
            userId: user?.id,
            socketId: notificationSocket.id
          });
        }
      });

      // 🔥 연결 성공 (강화된 로깅)
      notificationSocket.on('connect', () => {
        console.log('🔔 [NotificationSocket] ✅ Connected successfully');
        console.log('🔔 [NotificationSocket] Socket ID:', notificationSocket.id);
        console.log('🔔 [NotificationSocket] 🎯 Connected with user ID:', user?.id);
                  console.log('🔔 [NotificationSocket] Socket status:', {
            connected: notificationSocket.connected,
            id: notificationSocket.id,
            url: `${baseUrl}/notifications`,
            transport: notificationSocket.io.engine?.transport?.name || 'unknown',
            userId: user?.id,
            userEmail: user?.email
          });
        });

      // 연결 해제
      notificationSocket.on('disconnect', (reason) => {
        console.log('🔔 [NotificationSocket] ❌ Disconnected:', reason);
      });

      // 알림 서비스 연결 확인
      notificationSocket.on('notification_connected', (data) => {
        console.log('Notification service connected:', data);
        showToast('success', '실시간 알림이 활성화되었습니다.');
      });

      // 새 알림 수신
      notificationSocket.on('notification', (notification: Notification) => {
        console.log('🔔 [NotificationSocket] 🎉 New notification received:', notification);
        console.log('🔔 [NotificationSocket] Notification type:', notification.type);
        console.log('🔔 [NotificationSocket] Notification data:', notification.data);
        
        addNotification(notification);
        
        // 토스트로 알림 표시
        showToast('info', `${notification.title}: ${notification.message}`, 5000);
        console.log('🔔 [NotificationSocket] ✅ Notification processed and toast shown');
      });

      // 연결 오류
      notificationSocket.on('connect_error', (error) => {
        console.error('🔔 [NotificationSocket] ❌ Connection error:', error);
        console.error('🔔 [NotificationSocket] Error details:', {
          message: error.message,
          type: (error as any).type,
          description: (error as any).description,
          context: (error as any).context,
          url: `${baseUrl}/notifications`
        });
        
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
      console.error('🔔 [NotificationSocket] ❌ Failed to initialize notification socket:', error);
      console.error('🔔 [NotificationSocket] ❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown',
      });
      showToast('error', '실시간 알림 연결에 실패했습니다.');
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