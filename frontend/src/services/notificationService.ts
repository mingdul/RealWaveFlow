import api from '../lib/api';

export interface NotificationResponse {
  success: boolean;
  message: string;
  data?: {
    notifications: any[];
    unreadCount: number;
    totalCount: number;
  };
  error?: string;
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  data?: {
    unreadCount: number;
  };
  error?: string;
}

export interface MarkReadResponse {
  success: boolean;
  message: string;
  data?: {
    updatedCount: number;
  };
  error?: string;
}

class NotificationService {
  // 사용자의 모든 알림 조회
  async getUserNotifications(limit?: number, unread?: boolean): Promise<NotificationResponse> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (unread) params.append('unread', 'true');
      
      const queryString = params.toString();
      const url = queryString ? `/notifications?${queryString}` : '/notifications';
      
      console.log('📋 [NotificationService] 알림 조회 요청:', { limit, unread, url });
      
      const response = await api.get(url);
      console.log('📋 [NotificationService] 알림 조회 응답:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [NotificationService] 알림 조회 실패:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch notifications',
        error: error.message,
      };
    }
  }

  // 미읽은 알림 개수 조회
  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      console.log('🔢 [NotificationService] 미읽은 알림 개수 조회 요청');
      
      const response = await api.get('/notifications/unread-count');
      console.log('🔢 [NotificationService] 미읽은 알림 개수 응답:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [NotificationService] 미읽은 알림 개수 조회 실패:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch unread count',
        error: error.message,
      };
    }
  }

  // 특정 알림을 읽음으로 표시
  async markAsRead(notificationId: string): Promise<MarkReadResponse> {
    try {
      console.log('📖 [NotificationService] 알림 읽음 처리 요청:', notificationId);
      
      const response = await api.patch(`/notifications/${notificationId}/read`);
      console.log('📖 [NotificationService] 알림 읽음 처리 응답:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [NotificationService] 알림 읽음 처리 실패:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark notification as read',
        error: error.message,
      };
    }
  }

  // 모든 알림을 읽음으로 표시
  async markAllAsRead(): Promise<MarkReadResponse> {
    try {
      console.log('📖 [NotificationService] 모든 알림 읽음 처리 요청');
      
      const response = await api.patch('/notifications/mark-all-read');
      console.log('📖 [NotificationService] 모든 알림 읽음 처리 응답:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [NotificationService] 모든 알림 읽음 처리 실패:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark all notifications as read',
        error: error.message,
      };
    }
  }
}

export default new NotificationService(); 