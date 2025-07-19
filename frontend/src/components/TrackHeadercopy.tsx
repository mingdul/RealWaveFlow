import React, { useEffect, useState } from 'react';
import { ChevronLeft, Settings, Music, Calendar, User } from 'lucide-react';
import { Button } from './';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types/api';
import PresignedImage from './PresignedImage';

interface TrackHeaderCopyProps {
  onBack?: () => void;
  onSettingsClick?: () => void;
  track?: Track;
}

const TrackHeaderCopy: React.FC<TrackHeaderCopyProps> = ({
  onBack,
  onSettingsClick,
  track,
}) => {
  const navigate = useNavigate();
  const { notifications, unreadCount } = useNotifications();
  const { user } = useAuth();
  
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

  return (
    <div 
      className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-gray-800"
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
        <div className="flex space-x-6">
          <nav
            className="text-gray-300 hover:text-white text-sm font-medium cursor-pointer transition-colors"
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
          <Button size="sm" className="p-2 bg-transparent hover:bg-gray-800 text-white border border-gray-700" onClick={onSettingsClick}>
            <Settings size={20} />
          </Button>
        </div>
      </div>

      {/* 트랙 정보 섹션 */}
      {track && (
        <div className="px-6 py-6 bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-6">
            {/* 트랙 이미지 */}
            <div className="flex-shrink-0">
              <PresignedImage
                trackId={track.id}
                imageUrl={track.image_url}
                alt={track.title}
                className="w-20 h-20 rounded-xl shadow-lg object-cover border border-gray-700"
              />
            </div>

            {/* 트랙 메타정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Music className="w-5 h-5 text-amber-400" />
                <h1 className="text-2xl font-bold text-white truncate">{track.title}</h1>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-gray-300 mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>{track.owner_id?.username || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-400" />
                  <span>{new Date(track.created_date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* 트랙 태그들 */}
              <div className="flex items-center gap-2 flex-wrap">
                {track.genre && (
                  <span className="px-3 py-1 bg-purple-600/20 text-purple-300 text-xs font-medium rounded-full border border-purple-600/30">
                    {track.genre}
                  </span>
                )}
                {track.bpm && (
                  <span className="px-3 py-1 bg-amber-600/20 text-amber-300 text-xs font-medium rounded-full border border-amber-600/30">
                    {track.bpm} BPM
                  </span>
                )}
                {track.key_signature && (
                  <span className="px-3 py-1 bg-emerald-600/20 text-emerald-300 text-xs font-medium rounded-full border border-emerald-600/30">
                    {track.key_signature}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 트랙 설명 */}
          {track.description && (
            <div className="mt-4 p-4 bg-black/30 rounded-lg border border-gray-700">
              <p className="text-gray-300 text-sm leading-relaxed">{track.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackHeaderCopy; 