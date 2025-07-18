import api from '../lib/api';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

class NotificationService {
  // 사용자의 알림 조회 (limit 지원)
  async getUserNotifications(limit?: number): Promise<Notification[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      
      const queryString = params.toString();
      const url = queryString ? `/notifications?${queryString}` : '/notifications';
      
      console.log('📋 [NotificationService] 알림 조회 요청:', { limit, url });
      
      const response = await api.get(url);
      console.log('📋 [NotificationService] 알림 조회 응답:', response.data);
      
      // 백엔드가 직접 Notification[] 배열을 반환
      return response.data || [];
    } catch (error: any) {
      console.error('❌ [NotificationService] 알림 조회 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('User authentication required');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }

  // 특정 알림을 읽음으로 표시
  async markAsRead(notificationId: string): Promise<void> {
    try {
      console.log('📖 [NotificationService] 알림 읽음 처리 요청:', notificationId);
      
      await api.patch(`/notifications/${notificationId}/read`);
      console.log('📖 [NotificationService] 알림 읽음 처리 완료:', notificationId);
    } catch (error: any) {
      console.error('❌ [NotificationService] 알림 읽음 처리 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('User authentication required');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to mark notification as read');
    }
  }

  // 미읽은 알림 개수 계산 (클라이언트에서 계산)
  getUnreadCount(notifications: Notification[]): number {
    return notifications.filter(notification => !notification.isRead).length;
  }
}

export default new NotificationService(); 