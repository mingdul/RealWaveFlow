import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../types/notification';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();

  // 알림 상태 변경 시 로그 (개발용)
  useEffect(() => {
    if (unreadCount > 0) {
      console.log('🔔 [NotificationBell] Unread notifications:', unreadCount);
    }
  }, [unreadCount]);

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

  const toggleDropdown = async () => {
    // 🔥 NEW: 알림 버튼 클릭 시 최신 알림을 API에서 가져오기
    if (!isOpen) {
      console.log('🔔 [NotificationBell] Refreshing notifications from API...');
      try {
        await refreshNotifications();
      } catch (error) {
        console.error('🔔 [NotificationBell] Failed to refresh notifications:', error);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
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

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return '방금';
    if (diffInMinutes < 60) return `${diffInMinutes}분`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일`;
    
    return notificationTime.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
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
                  onClick={handleMarkAllAsRead}
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
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        notification.type === 'stage_created' ? 'bg-blue-500' :
                        notification.type === 'upstream_created' ? 'bg-green-500' :
                        notification.type === 'upstream_reviewed' ? 'bg-purple-500' :
                        notification.type === 'upstream_completed' ? 'bg-emerald-500' :
                        notification.type === 'track_approved' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`}></div>
                    </div>
                    
                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notification.title}
                        </h4>
                        <p className="text-xs text-gray-400 ml-2">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                      <p className={`text-sm ${!notification.read ? 'text-gray-700' : 'text-gray-500'} mt-0.5`}>
                        {notification.message}
                      </p>
                    </div>
                    
                    {/* 읽지 않은 알림 표시 */}
                    {!notification.read && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 푸터 (선택사항) */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-400 text-center">
                {notifications.length}개
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 