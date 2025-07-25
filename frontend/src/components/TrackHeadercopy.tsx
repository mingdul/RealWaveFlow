import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, Settings, User, LogOut } from 'lucide-react';
import { Button } from './';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import { Track } from '../types/api';
import ProfileSettingsModal from './ProfileSettingsModal';

interface TrackHeaderCopyProps {
  onBack?: () => void;
  onSettingsClick?: () => void;
  track?: Track;
  trackId?: string;
}

const TrackHeaderCopy: React.FC<TrackHeaderCopyProps> = ({
  onBack,
  // onSettingsClick,
}) => {
  const { notifications, unreadCount } = useNotification();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // 🔥 NEW: Settings 드롭다운 상태
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // 🔥 NEW: 강제 리렌더링을 위한 상태
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [lastNotificationTime, setLastNotificationTime] = useState<string>('');

  // 🔥 NEW: 네비게이션 버튼 활성 상태 관리
  const [activeNavButton, setActiveNavButton] = useState<string | null>(null);

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

  // 🔥 NEW: 네비게이션 버튼 핸들러들
  const handleStageHistoryClick = () => {
    const stageHistoryElement = document.querySelector('[data-section="stage-history"]');
    if (stageHistoryElement) {
      stageHistoryElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
    setActiveNavButton('stage-history');
  };

  const handleVersionHistoryClick = () => {
    const versionHistoryElement = document.querySelector('[data-section="version-history"]');
    if (versionHistoryElement) {
      versionHistoryElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
    setActiveNavButton('version-history');
  };

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



      // 🔥 추가: TrackHeader 전체 DOM 업데이트 확인
      setTimeout(() => {

      }, 100);
    };

    // 🔥 NEW: TrackHeader 전용 이벤트 리스너 추가
    const handleTrackHeaderSpecificRefresh = (event: CustomEvent) => {

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

  return (
    <div
      className="bg-black"
      key={`track-header-${forceRefreshKey}`} // 🔥 NEW: 강제 리렌더링을 위한 key
    >
      {/* 상단 네비게이션 바 */}
      <div className="px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button size="sm" className="p-2 " onClick={onBack}>
            <ChevronLeft className='text-white border-none focus:outline-none' size={20}  />
          </Button>
          <Logo />
        </div>

        <div className='flex items-center gap-4'>
          {/* Navigation Buttons */}
          <div className="flex items-center gap-6">
            {/* 스테이지 히스토리 */}
            <button
              onClick={handleStageHistoryClick}
              className="relative px-2 py-2 text-white bg-black border-none focus:outline-none"
            >
              <span className="text-sm font-medium">Version List</span>
              {activeNavButton === 'stage-history' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>

            {/* 버전 히스토리 */}
            <button
              onClick={handleVersionHistoryClick}
              className="relative px-2 py-2 text-white bg-black border-none focus:outline-none"
            >
              <span className="text-sm font-medium">Version History</span>
              {activeNavButton === 'version-history' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 🔥 NotificationBell에 실시간 상태 표시 */}
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

          {/* 🔥 NEW: Settings 드롭다운 메뉴 */}
          <div className="relative" ref={settingsDropdownRef}>
            <Button size="sm" className="p-2" onClick={handleSettingsClick}>
              <Settings className='text-white' size={20} />
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
      </div>
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default TrackHeaderCopy; 