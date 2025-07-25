import React, { useRef, useState, useEffect } from 'react';
import { BellRing } from 'lucide-react';
import { Button } from '../components';
import { useNotification } from '../contexts/NotificationContext';
import { NotificationBadge } from './NotificationBadge';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead } = useNotification();

  // 드롭다운 토글
  const toggleDropdown = () => setIsOpen(!isOpen);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 알림 읽음 처리
  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  // 알림 아이콘 선택
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
        className="p-2 bg-black text-white relative"
      >
        <span className="sr-only">알림 보기</span>
        <BellRing className="h-6 w-6" />
        <NotificationBadge />
      </Button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-2">
            <div className="px-4 py-2 text-sm font-semibold border-b border-gray-200">
              알림
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  새로운 알림이 없습니다
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;