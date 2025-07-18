export interface Notification {
  id: string;
  type: 'stage_created' | 'upstream_created' | 'upstream_completed' | 'upstream_reviewed' | 'track_approved';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  refreshNotifications: () => Promise<void>; // 🔥 NEW: API에서 최신 알림 가져오기
} 