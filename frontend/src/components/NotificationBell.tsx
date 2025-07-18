import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../types/notification';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, refreshNotifications } = useNotifications();

  // 알림 상태 변경 시 로그 및 실시간 Badge 업데이트 확인
  useEffect(() => {
    console.log('🔔 [NotificationBell] 🔄 Badge update triggered!');
    console.log('🔔 [NotificationBell] Current unreadCount:', unreadCount);
    console.log('🔔 [NotificationBell] Total notifications:', notifications.length);
    
    if (unreadCount > 0) {
      console.log('🔔 [NotificationBell] 🔴 Badge should show:', unreadCount);
    } else {
      console.log('🔔 [NotificationBell] ⚪ Badge should be hidden (no unread)');
    }
  }, [unreadCount, notifications.length]);

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
    console.log('🔔 [NotificationBell] 🖱️ Bell icon clicked!');
    console.log('🔔 [NotificationBell] Current state - isOpen:', isOpen, ', unreadCount:', unreadCount);
    
    // 드롭다운을 열 때만 API에서 최신 알림 목록을 가져옴
    // (Badge 개수는 소켓 이벤트로 실시간 업데이트됨)
    if (!isOpen) {
      console.log('🔔 [NotificationBell] 📋 Opening dropdown - fetching latest notification list from API...');
      try {
        await refreshNotifications();
        console.log('🔔 [NotificationBell] ✅ Notification list refreshed successfully');
      } catch (error) {
        console.error('🔔 [NotificationBell] ❌ Failed to refresh notification list:', error);
      }
    } else {
      console.log('🔔 [NotificationBell] 📋 Closing dropdown');
    }
    
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // 알림 데이터에 따라 적절한 페이지로 이동
    if (notification.data) {
      const { trackId, stageId } = notification.data;
      
      switch (notification.type) {
        case 'stage_created':
          if (trackId) {
            window.location.href = `/track/${trackId}`;
          }
          break;
        case 'upstream_created':
        case 'upstream_reviewed':
          if (trackId && stageId) {
            window.location.href = `/track/${trackId}?stage=${stageId}`;
          }
          break;
        default:
          console.log('Unknown notification type:', notification.type);
          break;
      }
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return '방금';
    if (diffInMinutes < 60) return `${diffInMinutes}분`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간`;
    return `${Math.floor(diffInMinutes / 1440)}일`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'stage_created':
        return '🎵';
      case 'upstream_created':
        return '📁';
      case 'upstream_reviewed':
        return '💬';
      case 'track_approved':
        return '✅';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 알림 벨 아이콘 */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
      >
        <span className="sr-only">View notifications</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17h5l-5 5v-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12V5a3 3 0 116 0v7" />
        </svg>
        
        {/* 읽지 않은 알림 개수 배지 - 실시간 업데이트 */}
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full transition-all duration-200 ease-in-out"
            key={`badge-${unreadCount}`} // key를 통한 강제 리렌더링
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* 디버그용 - 개발 중에만 표시 */}
        {import.meta.env.DEV && (
          <span className="absolute -bottom-6 -right-2 text-xs text-gray-400 bg-gray-100 px-1 rounded">
            Debug: {unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 max-h-96 overflow-hidden">
          <div className="py-1">
            {/* 헤더 */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">알림</h3>
                <span className="text-sm text-gray-500">
                  {unreadCount > 0 ? `${unreadCount}개의 새 알림` : '모든 알림을 확인했습니다'}
                </span>
              </div>
            </div>

            {/* 알림 목록 */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-5 5v-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 17h5l-5 5v-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 19v-7" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 12V5a3 3 0 116 0v7" />
                  </svg>
                  <p className="text-sm">알림이 없습니다</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`
                      block px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0
                      ${!notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      {/* 알림 아이콘 */}
                      <div className="flex-shrink-0">
                        <span className="text-2xl">
                          {getNotificationIcon(notification.type)}
                        </span>
                      </div>
                      
                      {/* 알림 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notification.message}
                          </h4>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        <p className={`text-sm ${!notification.isRead ? 'text-gray-700' : 'text-gray-500'} mt-0.5`}>
                          {notification.data?.stageTitle || notification.data?.upstreamTitle || ''}
                        </p>
                      </div>
                      
                      {/* 읽지 않은 알림 표시 */}
                      {!notification.isRead && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 푸터 */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="text-center">
                  <span className="text-sm text-gray-500">
                    총 {notifications.length}개의 알림
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 