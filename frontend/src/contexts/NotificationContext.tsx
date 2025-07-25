import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
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
        console.log('🔔 [NotificationSocket] Socket connected to:', `${baseUrl}/notifications`);
        console.log('🔔 [NotificationSocket] User for room join:', user?.id, user?.email);
        
        // 연결 성공 시 즉시 사용자 룸 조인 요청
        if (user?.id) {
          console.log('🔔 [NotificationSocket] 🚪 Requesting to join user room for user:', user.id);
          notificationSocket.emit('join_user_room', { userId: user.id });
          
          // 3초 후 room join 상태 확인
          setTimeout(() => {
            console.log('🔔 [NotificationSocket] 🔍 Checking room join status after 3 seconds...');
            notificationSocket.emit('check_room_status', { userId: user.id });
          }, 3000);
        } else {
          console.error('🔔 [NotificationSocket] ❌ No user ID available for room join!');
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

      // 소켓으로부터 새 알림 수신
      notificationSocket.on('notification', (notification: Notification) => {
        console.log('🔔 [NotificationSocket] 📡 New notification received:', {
          id: notification.id,
          type: notification.type,
          message: notification.message,
          isRead: notification.isRead
        });
        
        // 중요한 알림만 토스트로 표시
        if (notification.type === 'IMPORTANT' || notification.type === 'URGENT') {
          showToast('info', notification.message, 3000);
        }
        
        setNotifications(prevNotifications => {
          // 중복 방지
          const exists = prevNotifications.some(n => n.id === notification.id);
          if (exists) {
            console.log('🔔 [NotificationSocket] ⚠️ Duplicate notification ignored:', notification.id);
            return prevNotifications;
          }
          
          const newNotifications = [notification, ...prevNotifications];
          const newUnreadCount = newNotifications.filter(n => !n.isRead).length;
          
          console.log('🔔 [NotificationSocket] ✅ Notification added to state');
          console.log('🔔 [NotificationSocket] 📊 New counts - Total:', newNotifications.length, 'Unread:', newUnreadCount);
          console.log('🔔 [NotificationSocket] 🔔 This should immediately update the badge!');
          
          // 브라우저 이벤트 발생으로 컴포넌트들에게 알림
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('notification-count-updated', {
              detail: { 
                count: newUnreadCount,
                total: newNotifications.length,
                newNotification: notification
              }
            }));
            console.log('🔔 [NotificationSocket] 📢 Broadcast notification update event');
          }, 0);
          
          return newNotifications;
        });
      });

      // 🔥 NEW: 소켓 이벤트 감지 강화
      notificationSocket.onAny((eventName, ...args) => {
        console.log('🔔 [NotificationSocket] 🎯 ANY EVENT RECEIVED:', eventName, args);
      });

      // 🔥 NEW: 테스트용 이벤트 핸들러들
      notificationSocket.on('test_notification_result', (data) => {
        console.log('🧪 [NotificationSocket] Test notification result:', data);
      });

      notificationSocket.on('server_test', (data) => {
        console.log('🧪 [NotificationSocket] Server test event:', data);
      });

      notificationSocket.on('ping', (data) => {
        console.log('🏓 [NotificationSocket] Ping received:', data);
        notificationSocket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // 연결 오류
      notificationSocket.on('connect_error', (error) => {
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
      };
      console.log('🔧 [DEBUG] Debug tools available in window.debugNotifications');
      console.log('🔧 [DEBUG] Available methods:');
      console.log('  - addTestNotification(): Add a test notification');
      console.log('  - checkSocketStatus(): Check socket connection');
      console.log('  - forceRefresh(): Force refresh notifications from API');
      console.log('  - simulateSocketNotification(): Simulate a socket notification event');
      console.log('  - printCurrentState(): Print the current state of the notification system');
      console.log('  - triggerTrackHeaderRefresh(): Force TrackHeader to refresh');
      console.log('  - forceSocketEvent(): Force trigger socket notification event');
      console.log('  - socket: Direct access to socket object');
    }
  }, [notifications, unreadCount, socket?.connected, debugAddTestNotification, debugSimulateSocketNotification, debugPrintCurrentState, debugTriggerTrackHeaderRefresh, debugForceSocketEvent, socket]);

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