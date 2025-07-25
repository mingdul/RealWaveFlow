import React, { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface NotificationBadgeProps {
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ className = '' }) => {
  const { unreadCount } = useNotification();
  const [animate, setAnimate] = useState(false);

  // 카운트가 변경될 때마다 애니메이션 효과 적용
  useEffect(() => {
    if (unreadCount > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  if (unreadCount === 0) return null;

  return (
    <span 
      className={`
        absolute -top-1 -right-1 
        inline-flex items-center justify-center 
        px-2 py-1 text-xs font-bold leading-none 
        text-white bg-red-600 rounded-full
        transform translate-x-1/2 -translate-y-1/2
        transition-all duration-200 ease-in-out
        ${animate ? 'scale-110' : 'scale-100'}
        ${className}
      `}
    >
      {unreadCount}
    </span>
  );
}; 