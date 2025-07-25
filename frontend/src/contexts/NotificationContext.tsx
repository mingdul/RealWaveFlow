import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { Socket } from 'socket.io-client';
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
    if (user) {
      console.log('🔔 [NotificationProvider] Initializing for user:', user.email);
      
      // 기존 알림 로드
      loadExistingNotifications();
      
      // 기존 소켓에 notification 이벤트 리스너 추가
      setupNotificationListener();
      
    } else {
      setNotifications([]);
    }
  }, [user]);

  // 기존 소켓에 notification 이벤트 리스너 설정
  const setupNotificationListener = () => {
    // 전역 소켓 객체가 있는지 확인 (ChatGateway에서 연결된 소켓)
    const globalSocket = (window as any).socket;
    if (globalSocket && globalSocket.connected) {
      console.log('🔔 [NotificationProvider] Using existing socket for notifications');
      
      // notification 이벤트 리스너 추가
      globalSocket.on('notification', (notification: Notification) => {
        console.log('🔔 [NotificationProvider] ✅ Received notification:', notification);
        
        setNotifications(prevNotifications => {
          const exists = prevNotifications.some(n => n.id === notification.id);
          if (exists) {
            console.log('🔔 [NotificationProvider] ⚠️ Duplicate notification ignored:', notification.id);
            return prevNotifications;
          }
          
          // 새 알림을 미읽음 상태로 추가
          const newNotification = { ...notification, isRead: false };
          const newNotifications = [newNotification, ...prevNotifications];
          const newUnreadCount = newNotifications.filter(n => !n.isRead).length;
          
          console.log('🔔 [NotificationProvider] ✅ NEW NOTIFICATION ADDED!');
          console.log('🔔 [NotificationProvider] 📊 Badge should now show:', newUnreadCount);
          
          // 실시간 업데이트 이벤트 발생
          window.dispatchEvent(new CustomEvent('notification-realtime-update', {
            detail: { 
              newUnreadCount,
              totalCount: newNotifications.length,
              timestamp: new Date().toISOString(),
              source: 'socket-notification-received',
              newNotification: newNotification
            }
          }));
          
          // NotificationBell 강제 리렌더링을 위한 추가 이벤트
          window.dispatchEvent(new CustomEvent('notification-badge-update', {
            detail: { 
              unreadCount: newUnreadCount,
              timestamp: new Date().toISOString(),
              source: 'socket-notification-context'
            }
          }));
          
          return newNotifications;
        });
      });
      
      setSocket(globalSocket);
    } else {
      console.log('🔔 [NotificationProvider] No existing socket found or not connected, will retry...');
      // 2초 후 다시 시도
      setTimeout(setupNotificationListener, 2000);
    }
  };

  // 서버에서 기존 알림 로드 (API 호출)
  const loadExistingNotifications = async () => {
    try {
      console.log('📋 [NotificationProvider] 🌐 Calling API to load existing notifications...');
      const notifications = await notificationService.getUserNotifications(50);
      
      console.log(`📋 [NotificationProvider] ✅ API returned ${notifications.length} notifications`);
      setNotifications(notifications);
    } catch (error) {
      console.error('❌ [NotificationProvider] Failed to load notifications from API:', error);
      setNotifications([]);
    }
  };

  const addNotification = useCallback((notification: Notification) => {
    console.log('🔔 [NotificationProvider] 🚀 addNotification called with notification:', {
      id: notification.id,
      message: notification.message,
      isRead: notification.isRead,
      type: notification.type,
      userId: notification.userId
    });

    setNotifications(prev => {
      console.log('🔔 [NotificationProvider] 📊 BEFORE setState - Previous notifications:', prev.length);
      console.log('🔔 [NotificationProvider] 📊 BEFORE setState - Previous unread count:', prev.filter(n => !n.isRead).length);
      
      // 중복 알림 방지 (같은 ID가 이미 있다면 무시)
      const exists = prev.some(n => n.id === notification.id);
      if (exists) {
        console.log('🔔 [NotificationProvider] ⚠️ Duplicate notification ignored:', notification.id);
        return prev;
      }
      
      const newNotifications = [notification, ...prev];
      const newUnreadCount = newNotifications.filter(n => !n.isRead).length;
      
      console.log('🔔 [NotificationProvider] ✅ NEW NOTIFICATION ADDED SUCCESSFULLY!');
      console.log('🔔 [NotificationProvider] 📊 AFTER setState - Previous count:', prev.length, '→ New count:', newNotifications.length);
      console.log('🔔 [NotificationProvider] 📊 AFTER setState - New unread count should be:', newUnreadCount);
      console.log('🔔 [NotificationProvider] 🔔 New notification isRead:', notification.isRead, '(false means it will increase badge count)');
      
      
      return newNotifications;
    });
  }, []); // dependency 제거하여 함수가 재생성되지 않도록 함


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

  // 모든 미읽은 알림을 읽음으로 표시
  const markAllRead = async () => {
    try {
      console.log('📖 [NotificationProvider] 모든 알림 읽음 처리 시작...');
      
      // 로컬 상태 먼저 업데이트 (즉시 반영 - Badge 개수 0으로)
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      // API 호출로 서버에도 반영
      const result = await notificationService.markAllRead();
      console.log('📖 [NotificationProvider] 모든 알림 읽음 처리 완료:', result);
      
      // 토스트 메시지 표시
      if (result.count > 0) {
        showToast('success', `${result.count}개의 알림을 모두 읽음으로 표시했습니다.`);
      } else {
        showToast('info', '읽지 않은 알림이 없습니다.');
      }
      
      return result;
    } catch (error) {
      console.error('📖 [NotificationProvider] 모든 알림 읽음 처리 실패:', error);
      
      // 에러 시 상태 롤백 (알림들을 다시 읽지 않은 상태로)
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: false }))
      );
      
      showToast('error', '알림 읽음 처리에 실패했습니다.');
      
      // 인증 에러인 경우 로그아웃 처리
      if (error instanceof Error && error.message.includes('authentication required')) {
        showToast('error', '인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
      }
      
      throw error;
    }
  };

  // API에서 최신 알림 새로고침 (Bell 클릭 시 호출)
  const refreshNotifications = async () => {
    console.log('🔔 [NotificationProvider] 📋 Manually refreshing notifications from API...');
    console.log('🔔 [NotificationProvider] This is triggered by Bell icon click, NOT by socket events');
    await loadExistingNotifications();
    console.log('🔔 [NotificationProvider] ✅ Manual refresh completed');
  };

  // 🔧 DEBUG: 테스트용 함수들 (개발 환경에서만)
  const debugAddTestNotification = () => {
    if (import.meta.env.DEV) {
      const testNotification: Notification = {
        id: `test-${Date.now()}`,
        userId: user?.id || 'test-user',
        type: 'test',
        message: `🧪 테스트 알림 - ${new Date().toLocaleTimeString()}`,
        data: { test: true },
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      console.log('🧪 [DEBUG] Adding test notification manually...');
      console.log('🧪 [DEBUG] Test notification data:', testNotification);
      addNotification(testNotification);
      
      // 추가 확인을 위한 비동기 체크
      setTimeout(() => {
        console.log('🧪 [DEBUG] Test notification should now be visible in Bell badge!');
      }, 200);
    }
  };


  // 🔧 DEBUG: 소켓 알림 시뮬레이션
  const debugSimulateSocketNotification = () => {
    if (import.meta.env.DEV) {
      const fakeNotification: Notification = {
        id: `socket-test-${Date.now()}`,
        userId: user?.id || 'test-user',
        type: 'upstream_created',
        message: `🧪 실시간 테스트 알림 - ${new Date().toLocaleTimeString()}`,
        data: { 
          trackId: 'test-track-123',
          stageId: 'test-stage-456',
          trackName: '테스트 트랙',
          upstreamTitle: '테스트 업스트림'
        },
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      console.log('🧪 [DEBUG] Simulating socket notification event...');
      console.log('🧪 [DEBUG] Fake notification data:', fakeNotification);
      
      // 소켓 이벤트와 동일한 방식으로 처리
      setNotifications(prevNotifications => {
        console.log('🧪 [DEBUG] BEFORE adding test notification - Count:', prevNotifications.length);
        console.log('🧪 [DEBUG] BEFORE adding test notification - Unread:', prevNotifications.filter(n => !n.isRead).length);
        
        const newNotifications = [fakeNotification, ...prevNotifications];
        const newUnreadCount = newNotifications.filter(n => !n.isRead).length;
        
        console.log('🧪 [DEBUG] ✅ TEST NOTIFICATION ADDED!');
        console.log('🧪 [DEBUG] AFTER adding test notification - Count:', newNotifications.length);
        console.log('🧪 [DEBUG] AFTER adding test notification - Unread:', newUnreadCount);
        console.log('🧪 [DEBUG] 🔔 Badge should now show:', newUnreadCount);
        
        return newNotifications;
      });
    }
  };

  // 🔧 DEBUG: 소켓 연결 상태 강화된 체크
  const debugSocketStatus = () => {
    if (import.meta.env.DEV) {
      console.log('🔧 [DEBUG] ===== SOCKET STATUS DETAILED CHECK =====');
      console.log('🔧 [DEBUG] Socket exists:', !!socket);
      console.log('🔧 [DEBUG] Socket connected:', socket?.connected);
      console.log('🔧 [DEBUG] Socket ID:', socket?.id);
      console.log('🔧 [DEBUG] Socket transport:', socket?.io?.engine?.transport?.name);
      console.log('🔧 [DEBUG] User ID:', user?.id);
      console.log('🔧 [DEBUG] User email:', user?.email);
      console.log('🔧 [DEBUG] Current notifications count:', notifications.length);
      console.log('🔧 [DEBUG] Current unread count:', unreadCount);
      console.log('🔧 [DEBUG] Socket event listeners:');
      if (socket) {
        console.log('🔧 [DEBUG]   - notification:', socket.hasListeners('notification'));
        console.log('🔧 [DEBUG]   - connect:', socket.hasListeners('connect'));
        console.log('🔧 [DEBUG]   - disconnect:', socket.hasListeners('disconnect'));
        console.log('🔧 [DEBUG]   - join_user_room_success:', socket.hasListeners('join_user_room_success'));
        console.log('🔧 [DEBUG]   - join_user_room_error:', socket.hasListeners('join_user_room_error'));
      }
      console.log('🔧 [DEBUG] ==========================================');
      
      if (socket && user?.id) {
        console.log('🔧 [DEBUG] Testing room join...');
        socket.emit('join_user_room', { userId: user.id });
        
        // 🔥 NEW: 더 강력한 테스트 이벤트들 emit
        console.log('🔧 [DEBUG] Emitting test_notification...');
        socket.emit('test_notification', {
          userId: user.id,
          message: 'Debug test from client',
          timestamp: new Date().toISOString()
        });

        console.log('🔧 [DEBUG] Emitting force_notification_test...');
        socket.emit('force_notification_test', {
          userId: user.id,
          testMessage: 'Force notification test',
          timestamp: new Date().toISOString()
        });

        console.log('🔧 [DEBUG] Emitting request_server_ping...');
        socket.emit('request_server_ping', {
          userId: user.id,
          clientTimestamp: new Date().toISOString()
        });
      }
    }
  };

  // 🔧 DEBUG: 현재 상태 전체 출력
  const debugPrintCurrentState = () => {
    if (import.meta.env.DEV) {
      console.log('🔧 [DEBUG] ===== NOTIFICATION SYSTEM STATE =====');
      console.log('🔧 [DEBUG] User:', user?.email || 'Not logged in');
      console.log('🔧 [DEBUG] Socket connected:', socket?.connected || false);
      console.log('🔧 [DEBUG] Socket ID:', socket?.id || 'N/A');
      console.log('🔧 [DEBUG] Total notifications:', notifications.length);
      console.log('🔧 [DEBUG] Unread count:', unreadCount);
      console.log('🔧 [DEBUG] Recent notifications (first 3):');
      notifications.slice(0, 3).forEach((notif, index) => {
        console.log(`🔧 [DEBUG]   ${index + 1}. ${notif.message} (read: ${notif.isRead})`);
      });
      console.log('🔧 [DEBUG] =====================================');
    }
  };

  // 🔧 DEBUG: TrackHeader 강제 새로고침 테스트
  const debugTriggerTrackHeaderRefresh = () => {
    if (import.meta.env.DEV) {
      const timestamp = new Date().toISOString();
      console.log('🧪 [DEBUG] Triggering TrackHeader refresh test...');
      
      // TrackHeader 전용 이벤트 발생
      window.dispatchEvent(new CustomEvent('track-header-refresh', {
        detail: { 
          unreadCount: unreadCount,
          timestamp: timestamp,
          source: 'debug-track-header-test',
          notificationsCount: notifications.length
        }
      }));
      
      console.log('🧪 [DEBUG] TrackHeader refresh event dispatched');
      console.log('🧪 [DEBUG] Event details:', {
        unreadCount: unreadCount,
        timestamp: timestamp,
        notificationsCount: notifications.length
      });
    }
  };


  // 🔧 DEBUG: 소켓 강제 알림 이벤트 발생 테스트
  const debugForceSocketEvent = () => {
    if (import.meta.env.DEV && socket && socket.connected) {
      console.log('🧪 [DEBUG] Manually triggering socket notification event...');
      
      // 소켓에서 notification 이벤트를 강제로 발생시킴
      const testNotification: Notification = {
        id: `forced-socket-${Date.now()}`,
        userId: user?.id || 'test-user',
        type: 'upstream_created',
        message: `🧪 강제 소켓 알림 테스트 - ${new Date().toLocaleTimeString()}`,
        data: { 
          trackId: 'test-track-123',
          stageId: 'test-stage-456',
          trackName: '테스트 트랙',
          upstreamTitle: '테스트 업스트림'
        },
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      // notification 이벤트 핸들러를 직접 호출
      socket.emit('notification', testNotification);
      
      console.log('🧪 [DEBUG] Socket notification event manually triggered');
    } else {
      console.warn('🧪 [DEBUG] Cannot force socket event - socket not connected');
    }
  };

  // 🔧 DEBUG: 개발 환경에서 전역 접근 가능하도록 설정
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).debugNotifications = {
        addTestNotification: debugAddTestNotification,
        checkSocketStatus: debugSocketStatus,
        currentNotifications: notifications,
        currentUnreadCount: unreadCount,
        socketConnected: socket?.connected,
        forceRefresh: refreshNotifications,
        simulateSocketNotification: debugSimulateSocketNotification,
        printCurrentState: debugPrintCurrentState,
        triggerTrackHeaderRefresh: debugTriggerTrackHeaderRefresh,
        forceSocketEvent: debugForceSocketEvent,
        socket: socket, // 소켓 객체 직접 노출
        // 🔥 NEW: 실시간 알림 테스트 함수
        testRealtimeNotification: () => {
          const testNotif: Notification = {
            id: `realtime-test-${Date.now()}`,
            userId: user?.id || 'test-user',
            type: 'upstream_created',
            message: `🔥 실시간 테스트 알림 - ${new Date().toLocaleTimeString()}`,
            data: { trackId: 'test', stageId: 'test' },
            isRead: false,
            createdAt: new Date().toISOString()
          };
          
          console.log('🧪 [DEBUG] Testing realtime notification update...');
          
          // 소켓 이벤트 핸들러를 직접 트리거
          if (socket && socket.connected) {
            console.log('🧪 [DEBUG] Emitting test notification via socket...');
            socket.emit('notification', testNotif);
          } else {
            console.log('🧪 [DEBUG] Socket not connected, adding notification directly...');
            addNotification(testNotif);
          }
        }
      };
      console.log('🔧 [DEBUG] Debug tools available in window.debugNotifications');
      console.log('🔧 [DEBUG] NEW: testRealtimeNotification() - Test realtime badge update');
      console.log('🔧 [DEBUG] Use: window.debugNotifications.testRealtimeNotification()');
    }
  }, [notifications, unreadCount, socket?.connected, debugAddTestNotification, debugSimulateSocketNotification, debugPrintCurrentState, debugTriggerTrackHeaderRefresh, debugForceSocketEvent, socket, user?.id, addNotification]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllRead,
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