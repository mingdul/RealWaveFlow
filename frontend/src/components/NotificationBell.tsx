import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../types/notification';
import { BellRing } from 'lucide-react';
import { Button } from '../components/';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllRead, refreshNotifications } = useNotifications();

  // 로컬 상태로 unread count 관리하여 즉시 업데이트 보장
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);
  
  // Context의 unreadCount가 변경되면 로컬 상태도 즉시 업데이트
  useEffect(() => {
    setLocalUnreadCount(unreadCount);
    console.log('🔔 [NotificationBell] Context unreadCount changed:', unreadCount, '-> updating local state');
  }, [unreadCount]);
  
  // notifications 배열 변경시에도 직접 계산하여 업데이트
  useEffect(() => {
    const calculatedUnread = notifications.filter(n => !n.isRead).length;
    if (calculatedUnread !== localUnreadCount) {
      setLocalUnreadCount(calculatedUnread);
      console.log('🔔 [NotificationBell] Notifications changed, recalculated unread:', calculatedUnread);
    }
  }, [notifications, localUnreadCount]);

  // 개발 환경에서만 렌더링 로그
  if (import.meta.env.DEV) {
    console.log('🔔 [NotificationBell] 🎭 RENDER - Badge should show:', localUnreadCount);
    console.log('🔔 [NotificationBell] Context unreadCount:', unreadCount, 'Local unreadCount:', localUnreadCount);
  }

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

  const handleMarkAllRead = async () => {
    if (localUnreadCount === 0) return; // 읽지 않은 알림이 없으면 무시

    setIsMarkingAllRead(true);
    // 즉시 로컬 상태 업데이트 (UI 반응성 향상)
    setLocalUnreadCount(0);
    
    try {
      console.log('📖 [NotificationBell] 모든 알림 읽음 처리 시작...');
      await markAllRead();
      console.log('📖 [NotificationBell] 모든 알림 읽음 처리 완료');
    } catch (error) {
      console.error('📖 [NotificationBell] 모든 알림 읽음 처리 실패:', error);
      // 실패시 원래 상태로 복원
      setLocalUnreadCount(unreadCount);
    } finally {
      setIsMarkingAllRead(false);
    }
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
      <Button
        onClick={toggleDropdown}
        size="sm"
        className="p-2 bg-black text-white"
      >
        <span className="sr-only">View notifications</span>
        <BellRing className="h-6 w-6" />

        {/* 읽지 않은 알림 개수 배지 - 실시간 업데이트 */}
        {localUnreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full transition-all duration-200 ease-in-out"
            key={`badge-${localUnreadCount}-${notifications.length}`}
          >
            {localUnreadCount > 99 ? '99+' : localUnreadCount}
          </span>
        )}

        {/* 디버그용 - 개발 중에만 표시 */}
        {import.meta.env.DEV && (
          <span className="absolute -bottom-6 -right-2 text-xs text-gray-400 bg-gray-100 px-1 rounded">
            Debug: {localUnreadCount} (ctx: {unreadCount})
          </span>
        )}
      </Button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 max-h-96 overflow-hidden">
          <div className="py-1">
            {/* 헤더 */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">알림</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">
                    {localUnreadCount > 0 ? `${localUnreadCount}개의 새 알림` : '모든 알림을 확인했습니다'}
                  </span>
                  {/* 모두 읽음 버튼 */}
                  {localUnreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={isMarkingAllRead}
                      className={`
                        px-3 py-1 text-xs font-medium rounded-md transition-all
                        ${isMarkingAllRead
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                        }
                      `}
                    >
                      {isMarkingAllRead ? (
                        <span className="flex items-center space-x-1">
                          <svg className="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>처리중</span>
                        </span>
                      ) : (
                        '모두 읽음'
                      )}
                    </button>
                  )}
                </div>
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