import React, { useEffect } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { Button } from './';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

interface TrackHeaderProps {
  onBack?: () => void;
  onSettingsClick?: () => void;
}

const TrackHeader: React.FC<TrackHeaderProps> = ({
  onBack,
  onSettingsClick,
}) => {
  const navigate = useNavigate();
  const { notifications, unreadCount } = useNotifications();
  const { user } = useAuth();

  // 🔥 TrackHeader에서 소켓 연결 상태 모니터링
  useEffect(() => {
    console.log('🏠 [TrackHeader] 🚀 Component mounted/updated');
    console.log('🏠 [TrackHeader] 👤 Current user:', user ? `${user.id} (${user.email})` : 'None');
    console.log('🏠 [TrackHeader] 🔔 Notifications count:', notifications.length);
    console.log('🏠 [TrackHeader] 📨 Unread count:', unreadCount);
    console.log('🏠 [TrackHeader] 📋 Notifications details:', notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      read: n.read
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
          title: notifications[0].title,
          timestamp: notifications[0].timestamp,
          read: notifications[0].read
        });
      }
    }, 10000);

    return () => {
      console.log('🏠 [TrackHeader] 🔚 Component unmounting');
      clearInterval(interval);
    };
  }, [user, notifications, unreadCount]);

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
    <div className="bg-black px-6 py-4 flex items-center justify-between">
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
              {notifications.length}/{unreadCount}
            </div>
          )}
        </div>
        <Button size="sm" className="p-2 bg-black text-white" onClick={onSettingsClick}>
          <Settings size={20} />
        </Button>
      </div>
    </div>
  );
};

export default TrackHeader; 