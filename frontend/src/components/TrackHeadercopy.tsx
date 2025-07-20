import React, { useEffect, useState } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { Button } from './';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useNotifications } from '../contexts/NotificationContext';
import { Track } from '../types/api';


interface TrackHeaderCopyProps {
  onBack?: () => void;
  onSettingsClick?: () => void;
  track?: Track;
}

const TrackHeaderCopy: React.FC<TrackHeaderCopyProps> = ({
  onBack,
  onSettingsClick,

}) => {
  const { notifications, unreadCount } = useNotifications();

  
  // 🔥 NEW: 강제 리렌더링을 위한 상태
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [lastNotificationTime, setLastNotificationTime] = useState<string>('');





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
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button size="sm" className="p-2 bg-transparent hover:bg-gray-800 text-white border border-gray-700" onClick={onBack}>
            <ChevronLeft size={20} />
          </Button>
          <Logo />
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

          <Button size="sm" className="p-2 bg-transparent hover:bg-gray-800 text-white border border-gray-700" onClick={onSettingsClick}>
            <Settings size={20} />
          </Button>
        </div>
      </div>

    </div>
  );
};

export default TrackHeaderCopy; 