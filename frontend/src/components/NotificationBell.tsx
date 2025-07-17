import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../types/notification';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // 🔥 실시간 상태 모니터링
  useEffect(() => {
    console.log('🔔 [NotificationBell] 🔄 State changed - Notifications:', notifications.length, 'Unread:', unreadCount);
    console.log('🔔 [NotificationBell] 📋 Current notifications:', notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      read: n.read,
      timestamp: n.timestamp
    })));
  }, [notifications, unreadCount]);

  // 🔥 컴포넌트 마운트 시 초기 상태 확인
  useEffect(() => {
    console.log('🔔 [NotificationBell] 🚀 Component mounted');
    console.log('🔔 [NotificationBell] 📊 Initial state:');
    console.log('  - Notifications count:', notifications.length);
    console.log('  - Unread count:', unreadCount);
    console.log('  - Has notifications context:', !!useNotifications);
    
    // 5초마다 상태 확인
    const interval = setInterval(() => {
      console.log('🔔 [NotificationBell] ⏰ Periodic check:');
      console.log('  - Current time:', new Date().toLocaleTimeString());
      console.log('  - Notifications:', notifications.length);
      console.log('  - Unread:', unreadCount);
      console.log('  - Latest notification:', notifications[0] ? {
        title: notifications[0].title,
        time: notifications[0].timestamp,
        type: notifications[0].type
      } : 'None');
    }, 5000);

    return () => {
      console.log('🔔 [NotificationBell] 🔚 Component unmounting');
      clearInterval(interval);
    };
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    console.log('🔔 [NotificationBell] 🖱️ Button clicked - Current state:', isOpen);
    console.log('🔔 [NotificationBell] 📊 Current data:');
    console.log('  - Notifications array:', notifications);
    console.log('  - Unread count:', unreadCount);
    console.log('  - Notifications length:', notifications.length);
    console.log('  - First notification:', notifications[0] || 'None');
    console.log('  - Context available:', !!useNotifications);
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // 알림 데이터에 따라 적절한 페이지로 이동
    if (notification.data) {
      const { trackId, stageId, upstreamId } = notification.data;
      
      switch (notification.type) {
        case 'stage_created':
          if (trackId) {
            window.location.href = `/track/${trackId}`;
          }
          break;
        case 'upstream_created':
          if (stageId) {
            window.location.href = `/stage/${stageId}`;
          }
          break;
        case 'upstream_reviewed':
          if (upstreamId) {
            window.location.href = `/review/${upstreamId}`;
          }
          break;
        default:
          break;
      }
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'stage_created':
        return '🎵';
      case 'upstream_created':
        return '📁';
      case 'upstream_completed':
        return '✅';
      case 'upstream_reviewed':
        return '💬';
      case 'track_approved':
        return '🎉';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    return notificationTime.toLocaleDateString('ko-KR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 벨 아이콘 */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-white hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-colors"
        aria-label="알림 보기"
      >
        {/* 벨 아이콘 (SVG) */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5-5V9a6 6 0 1 0-12 0v3l-5 5h5m7 0v1a3 3 0 0 1-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* 알림 개수 뱃지 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">알림</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  모두 읽음
                </button>
              )}
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-5-5V9a6 6 0 1 0-12 0v3l-5 5h5m7 0v1a3 3 0 0 1-6 0v-1m6 0H9"
                  />
                </svg>
                <p>새로운 알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* 아이콘 */}
                    <div className="flex-shrink-0 text-xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h4>
                      <p className={`text-sm ${!notification.read ? 'text-gray-700' : 'text-gray-500'} mt-1`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                    
                    {/* 읽지 않은 알림 표시 */}
                    {!notification.read && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 푸터 (선택사항) */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                총 {notifications.length}개의 알림
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 