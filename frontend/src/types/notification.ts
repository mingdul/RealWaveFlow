export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
  refreshNotifications: () => Promise<void>; // API에서 최신 알림 가져오기
} 