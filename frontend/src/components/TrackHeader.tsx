import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, Settings, User, LogOut } from 'lucide-react';
import { Button } from './';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import ProfileSettingsModal from './ProfileSettingsModal';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

interface TrackHeaderProps {
  onBack?: () => void;
}

const TrackHeader: React.FC<TrackHeaderProps> = ({
  onBack,
}) => {
  const navigate = useNavigate();
  const { notifications, unreadCount } = useNotifications();
  const { user, logout } = useAuth();
  
  // 🔥 NEW: Settings 드롭다운 상태
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  
  // 🔥 NEW: 강제 리렌더링을 위한 상태
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [lastNotificationTime, setLastNotificationTime] = useState<string>('');

  console.log('🏠 [TrackHeader] 🎭 COMPONENT RENDERED');
  console.log('🏠 [TrackHeader] 📊 Current state:', {
    user: user?.email,
    notificationsCount: notifications.length,
    unreadCount: unreadCount,
    forceRefreshKey: forceRefreshKey,
    lastNotificationTime: lastNotificationTime
  });

  // 🔥 TrackHeader에서 소켓 연결 상태 모니터링
  useEffect(() => {
    console.log('🏠 [TrackHeader] 🚀 Component mounted/updated');
    console.log('🏠 [TrackHeader] 👤 Current user:', user ? `${user.id} (${user.email})` : 'None');
    console.log('🏠 [TrackHeader] 🔔 Notifications count:', notifications.length);
    console.log('🏠 [TrackHeader] 📨 Unread count:', unreadCount);
    console.log('🏠 [TrackHeader] 📋 Notifications details:', notifications.map(n => ({
      id: n.id,
      type: n.type,
      message: n.message,
      isRead: n.isRead
    })));

    // 10초마다 상태 확인
    const interval = setInterval(() => {
      console.log('🏠 [TrackHeader] ⏰ Periodic status check:');
      console.log('  - Time:', new Date().toLocaleTimeString());
      console.log('  - User logged in:', !!user);
      console.log('  - Notifications count:', notifications.length);
      console.log('  - Unread count:', unreadCount);
      console.log('  - Has NotificationContext:', !!useNotifications);
      
      if (notifications.length > 0) {
        console.log('  - Latest notification:', {
          id: notifications[0].id,
          type: notifications[0].type,
          message: notifications[0].message,
          createdAt: notifications[0].createdAt,
          isRead: notifications[0].isRead
        });
      }
    }, 10000);

    return () => {
      console.log('🏠 [TrackHeader] 🔚 Component unmounting');
      clearInterval(interval);
    };
  }, [user, notifications, unreadCount]);

  // 🔥 NEW: 소켓 알림 수신 시 TrackHeader 강제 새로고침을 위한 커스텀 이벤트 리스너
  useEffect(() => {
    const handleTrackHeaderRefresh = (event: CustomEvent) => {
      const { unreadCount: newUnreadCount, timestamp, source, notificationsCount } = event.detail;
      
      console.log('🏠 [TrackHeader] 📢 Received refresh trigger event!');
      console.log('🏠 [TrackHeader] 📊 New unread count from event:', newUnreadCount);
      console.log('🏠 [TrackHeader] 📋 Notifications count from event:', notificationsCount);
      console.log('🏠 [TrackHeader] ⏰ Event timestamp:', timestamp);
      console.log('🏠 [TrackHeader] 📡 Event source:', source || 'unknown');
      
      // 🔥 강제 리렌더링 트리거
      const newRefreshKey = forceRefreshKey + 1;
      setForceRefreshKey(newRefreshKey);
      setLastNotificationTime(timestamp);
      
      console.log('🏠 [TrackHeader] 🔄 TrackHeader force refresh triggered!');
      console.log('🏠 [TrackHeader] 📊 Refresh key updated:', forceRefreshKey, '→', newRefreshKey);
      
      // 🔥 추가: TrackHeader 전체 DOM 업데이트 확인
      setTimeout(() => {
        console.log('🏠 [TrackHeader] 🔍 TrackHeader refresh completed');
        console.log('🏠 [TrackHeader] 📊 Current state after refresh:', {
          notificationsCount: notifications.length,
          unreadCount: unreadCount,
          refreshKey: newRefreshKey
        });
      }, 100);
    };

    // 🔥 NEW: TrackHeader 전용 이벤트 리스너 추가
    const handleTrackHeaderSpecificRefresh = (event: CustomEvent) => {
      console.log('🏠 [TrackHeader] 🎯 Received TrackHeader-specific refresh event!');
      console.log('🏠 [TrackHeader] Event details:', event.detail);
      
      // 기존 핸들러와 동일한 로직 실행
      handleTrackHeaderRefresh(event);
    };

    // 커스텀 이벤트 리스너 등록 (두 개의 이벤트 모두 수신)
    window.addEventListener('notification-badge-update', handleTrackHeaderRefresh as EventListener);
    window.addEventListener('track-header-refresh', handleTrackHeaderSpecificRefresh as EventListener);
    
    console.log('🏠 [TrackHeader] 👂 TrackHeader refresh event listeners registered');
    console.log('🏠 [TrackHeader] 🎯 Listening for: notification-badge-update, track-header-refresh');

    return () => {
      window.removeEventListener('notification-badge-update', handleTrackHeaderRefresh as EventListener);
      window.removeEventListener('track-header-refresh', handleTrackHeaderSpecificRefresh as EventListener);
      console.log('🏠 [TrackHeader] 🔇 TrackHeader refresh event listeners removed');
    };
  }, [forceRefreshKey, notifications.length, unreadCount]);

  // 🔥 알림 변화 감지
  useEffect(() => {
    if (notifications.length > 0) {
      console.log('🏠 [TrackHeader] 🆕 Notifications changed!');
      console.log('  - New count:', notifications.length);
      console.log('  - Unread count:', unreadCount);
      console.log('  - Latest notification:', notifications[0]);
    }
  }, [notifications]);

  // 🔥 NEW: Settings 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setIsSettingsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔥 NEW: Settings 메뉴 핸들러들
  const handleSettingsClick = () => {
    setIsSettingsDropdownOpen(!isSettingsDropdownOpen);
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
    setIsSettingsDropdownOpen(false);
  };

  const handleLogoutClick = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setIsSettingsDropdownOpen(false);
  };

  return (
    <div 
      className="bg-black px-6 py-4 flex items-center justify-between"
      key={`track-header-${forceRefreshKey}`} // 🔥 NEW: 강제 리렌더링을 위한 key
    >
      <div className="flex items-center gap-4">
        <Button size="sm" className="p-2 bg-black text-white" onClick={onBack}>
          <ChevronLeft size={20} />
        </Button>
        <Logo />
      </div>
      <div className="flex space-x-4">
        <nav
          className="text-white text-sm"
          onClick={() => navigate(`/dashboard`)}
        >
          Dashboard
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {/* 🔥 NotificationBell에 실시간 상태 표시 */}
        <div className="relative">
          <NotificationBell />
          {/* 개발 환경에서만 보이는 상태 표시 */}
          {import.meta.env.DEV && (
            <div className="absolute -bottom-8 right-0 text-xs text-gray-400 whitespace-nowrap">
              {notifications.length}/{unreadCount} (Refresh: {forceRefreshKey})
              {lastNotificationTime && (
                <div className="text-xs text-green-400">
                  Last: {new Date(lastNotificationTime).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
        {/* 🔥 NEW: Settings 드롭다운 메뉴 */}
        <div className="relative" ref={settingsDropdownRef}>
          <Button size="sm" className="p-2 bg-black text-white" onClick={handleSettingsClick}>
            <Settings size={20} />
          </Button>
          
          {/* Settings 드롭다운 메뉴 */}
          {isSettingsDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-1">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <User size={16} />
                  프로필 설정
                </button>
                <button
                  onClick={handleLogoutClick}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LogOut size={16} />
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔥 NEW: ProfileSettingsModal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default TrackHeader; 