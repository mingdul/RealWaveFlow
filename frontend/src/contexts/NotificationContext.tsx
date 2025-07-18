import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { Notification, NotificationContextType } from '../types/notification';
import notificationService from '../services/notificationService';

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

  // 미읽은 알림 개수 계산 (useMemo로 최적화 및 명시적 dependency 관리)
  const unreadCount = useMemo(() => {
    const count = notifications.filter(notification => !notification.isRead).length;
    console.log('🔔 [NotificationProvider] Unread count calculated:', count, 'from', notifications.length, 'total notifications');
    return count;
  }, [notifications]);

  // 알림 시스템 상태 (핵심 정보만)
  console.log('🔔 [NotificationProvider] User:', user?.email || 'not logged in', '| Notifications:', notifications.length, '| Unread:', unreadCount);

  useEffect(() => {
        // 기존 소켓이 있다면 정리
    const currentSocket = socket;
    if (currentSocket) {
      currentSocket.disconnect();
      setSocket(null);
    }

    if (user) {
      console.log('🔔 [NotificationProvider] Initializing for user:', user.email);
      
      // 🔥 NEW: 로그인 후 즉시 기존 알림 로드 (소켓 연결 전)
      loadExistingNotifications();
      
      // 🔥 NEW: 소켓 연결은 별도로 진행
      initializeNotificationSocket();
      
      return () => {
        if (socket) {
          socket.disconnect();
        }
      };
    } else {
      setNotifications([]);
    }
  }, [user]);  // user만 dependency로 유지

  // 서버에서 기존 알림 로드 (API 호출)
  const loadExistingNotifications = async () => {
    try {
      console.log('📋 [NotificationProvider] 🌐 Calling API to load existing notifications...');
      const notifications = await notificationService.getUserNotifications(50);
      
      console.log(`📋 [NotificationProvider] ✅ API returned ${notifications.length} notifications`);
      console.log(`📋 [NotificationProvider] Setting notifications state (this will trigger unreadCount recalculation)`);
      setNotifications(notifications);
    } catch (error) {
      console.error('❌ [NotificationProvider] Failed to load notifications from API:', error);
      
      // 인증 에러인 경우 로그아웃 처리
      if (error instanceof Error && error.message.includes('authentication required')) {
        showToast('error', '인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
      }
      
      setNotifications([]);
    }
  };

  const initializeNotificationSocket = () => {
    try {
      // Socket.IO는 자동으로 /socket.io/ 경로를 추가하므로 base URL만 사용
      const baseUrl = import.meta.env.VITE_API_URL ? 
        import.meta.env.VITE_API_URL.replace('/api', '') : 
        'https://waveflow.pro';
      
      console.log('🔔 [NotificationSocket] Connecting to:', `${baseUrl}/notifications`);
      console.log('🔔 [NotificationSocket] Current user:', user?.email);
      
      // 알림 전용 소켓 연결 (/notifications 네임스페이스)
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

      // 연결 성공
      notificationSocket.on('connect', () => {
        console.log('🔔 [NotificationSocket] ✅ Connected successfully, Socket ID:', notificationSocket.id);
        // 🔥 REMOVED: 토스트 제거
        // showToast('success', '실시간 알림이 연결되었습니다.', 2000);
        
        // 🔥 NEW: 연결 성공 시 즉시 사용자 룸 조인 요청
        if (user?.id) {
          console.log('🔔 [NotificationSocket] Requesting to join user room:', user.id);
          notificationSocket.emit('join_user_room', { userId: user.id });
        }
      });

      // 연결 해제
      notificationSocket.on('disconnect', (reason) => {
        console.log('🔔 [NotificationSocket] ❌ Disconnected:', reason);
        // 🔥 REMOVED: 토스트 제거
        // showToast('warning', '실시간 알림 연결이 해제되었습니다.', 2000);
      });

      // 알림 서비스 연결 확인
      notificationSocket.on('notification_connected', (data) => {
        console.log('🔔 [NotificationSocket] Notification service connected:', data);
        
        // 🔥 MODIFIED: silent 플래그가 없을 때만 토스트 표시 (기본적으로 토스트 없음)
        if (!data.silent) {
          showToast('success', '알림 서비스가 활성화되었습니다.', 3000);
        }
        
        // 🔥 REMOVED: 중복 방지 - 이미 useEffect에서 로드했으므로 여기서는 제거
        // loadExistingNotifications();
      });

      // 🔥 NEW: 룸 조인 성공 이벤트
      notificationSocket.on('join_user_room_success', (data) => {
        console.log('🔔 [NotificationSocket] ✅ Successfully joined user room:', data);
        // 🔥 REMOVED: 토스트 제거
        // showToast('success', `알림 룸에 연결되었습니다. (${data.room})`, 2000);
      });

      // 🔥 NEW: 룸 조인 실패 이벤트
      notificationSocket.on('join_user_room_error', (data) => {
        console.error('🔔 [NotificationSocket] ❌ Failed to join user room:', data);
        // 🔥 REMOVED: 토스트 제거, 로그만 남김
        // showToast('error', `알림 룸 연결에 실패했습니다: ${data.message}`, 3000);
      });

      // 새 알림 수신
      notificationSocket.on('notification', (notification: Notification) => {
        console.log('🔔 [NotificationSocket] 📢 New notification received via WebSocket!');
        console.log('🔔 [NotificationSocket] Notification details:', {
          id: notification.id,
          message: notification.message,
          type: notification.type,
          isRead: notification.isRead,
          userId: notification.userId
        });
        
        // 즉시 알림 추가 (Badge 개수 실시간 업데이트)
        addNotification(notification);
        
        console.log('🔔 [NotificationSocket] ✅ addNotification called - Badge should update now!');
        
        // 🔥 REMOVED: 토스트 제거 - Bell 아이콘의 개수만 증가
        // showToast('info', `${notification.message}`, 5000);
      });

      // 연결 오류
      notificationSocket.on('connect_error', (error) => {
        console.error('🔔 [NotificationSocket] ❌ Connection error:', error.message);
        // 🔥 REMOVED: 일반 연결 오류는 토스트 표시하지 않음
        // showToast('error', '실시간 알림 연결에 실패했습니다.', 3000);
        
        if (error.message.includes('Unauthorized')) {
          showToast('error', '인증이 만료되었습니다. 다시 로그인해주세요.');
          logout();
        }
      });

      // 인증 실패
      notificationSocket.on('unauthorized', (_data) => {
        console.log('🔔 [NotificationProvider] WebSocket 인증 실패');
        showToast('error', '인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
      });

      // 재연결 시 기존 알림 다시 로드
      notificationSocket.on('reconnect', (_attemptNumber) => {
        console.log('🔔 [NotificationProvider] WebSocket 재연결됨 - 룸 재조인 및 알림 다시 로드');
        if (user?.id) {
          // 🔥 NEW: 재연결 시에도 룸 조인 재요청
          console.log('🔔 [NotificationSocket] Reconnected - Requesting to join user room again:', user.id);
          notificationSocket.emit('join_user_room', { userId: user.id });
          
          loadExistingNotifications();
        }
      });

      // 연결 소켓 저장
      setSocket(notificationSocket);
      
      console.log('🔔 [NotificationSocket] Socket initialization completed');
      
    } catch (error) {
      console.error('🔔 [NotificationSocket] ❌ Failed to initialize socket:', error);
      showToast('error', '알림 시스템 초기화에 실패했습니다.');
    }
  };

  const addNotification = (notification: Notification) => {
    console.log('🔔 [NotificationProvider] addNotification called with:', {
      id: notification.id,
      message: notification.message,
      isRead: notification.isRead,
      type: notification.type
    });

    setNotifications(prev => {
      // 중복 알림 방지 (같은 ID가 이미 있다면 무시)
      const exists = prev.some(n => n.id === notification.id);
      if (exists) {
        console.log('🔔 [NotificationProvider] Duplicate notification ignored:', notification.id);
        return prev;
      }
      
      const newNotifications = [notification, ...prev];
      console.log('🔔 [NotificationProvider] ✅ New notification added successfully');
      console.log('🔔 [NotificationProvider] Previous count:', prev.length, '→ New count:', newNotifications.length);
      console.log('🔔 [NotificationProvider] New notification isRead:', notification.isRead);
      
      return newNotifications;
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // 로컬 상태 먼저 업데이트 (즉시 반영)
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      // API 호출로 서버에도 반영
      await notificationService.markAsRead(notificationId);
      console.log('📖 [NotificationProvider] Successfully marked as read:', notificationId);
    } catch (error) {
      console.error('📖 [NotificationProvider] Error marking as read:', error);
      
      // 에러 시 상태 롤백
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: false }
            : notification
        )
      );
      
      // 인증 에러인 경우 로그아웃 처리
      if (error instanceof Error && error.message.includes('authentication required')) {
        showToast('error', '인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
      }
    }
  };



  const clearNotifications = () => {
    setNotifications([]);
  };

  // API에서 최신 알림 새로고침 (Bell 클릭 시 호출)
  const refreshNotifications = async () => {
    console.log('🔔 [NotificationProvider] 📋 Manually refreshing notifications from API...');
    console.log('🔔 [NotificationProvider] This is triggered by Bell icon click, NOT by socket events');
    await loadExistingNotifications();
    console.log('🔔 [NotificationProvider] ✅ Manual refresh completed');
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    clearNotifications,
    refreshNotifications,
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