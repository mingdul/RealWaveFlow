import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationPayload } from './notification.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  // 알림 생성 및 저장
  async createNotification(userId: string, notificationPayload: NotificationPayload): Promise<Notification> {
    try {
      const notification = this.notificationRepository.create({
        // id는 자동 생성되므로 설정하지 않음
        type: notificationPayload.type,
        title: notificationPayload.title,
        message: notificationPayload.message,
        data: notificationPayload.data,
        read: notificationPayload.read,
        user_id: userId,
      });

      const savedNotification = await this.notificationRepository.save(notification);
      this.logger.log(`💾 [NotificationService] 알림 저장 완료: ${savedNotification.id} for user ${userId}`);
      
      return savedNotification;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 알림 저장 실패: ${error.message}`);
      throw error;
    }
  }

  // 사용자의 모든 알림 조회 (최신순)
  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      const notifications = await this.notificationRepository.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take: limit,
      });

      this.logger.log(`📋 [NotificationService] 사용자 ${userId}의 알림 ${notifications.length}개 조회 완료`);
      return notifications;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 알림 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // 사용자의 미읽은 알림 조회
  async getUserUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      const notifications = await this.notificationRepository.find({
        where: { user_id: userId, read: false },
        order: { created_at: 'DESC' },
      });

      this.logger.log(`📋 [NotificationService] 사용자 ${userId}의 미읽은 알림 ${notifications.length}개 조회 완료`);
      return notifications;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 미읽은 알림 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // 특정 알림을 읽음으로 표시
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.notificationRepository.update(
        { id: notificationId, user_id: userId },
        { read: true }
      );

      const success = result.affected > 0;
      this.logger.log(`📖 [NotificationService] 알림 읽음 처리 ${success ? '성공' : '실패'}: ${notificationId}`);
      
      return success;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 알림 읽음 처리 실패: ${error.message}`);
      throw error;
    }
  }

  // 사용자의 모든 알림을 읽음으로 표시
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await this.notificationRepository.update(
        { user_id: userId, read: false },
        { read: true }
      );

      const count = result.affected || 0;
      this.logger.log(`📖 [NotificationService] 사용자 ${userId}의 알림 ${count}개 모두 읽음 처리 완료`);
      
      return count;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 전체 알림 읽음 처리 실패: ${error.message}`);
      throw error;
    }
  }

  // 미읽은 알림 개수 조회
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await this.notificationRepository.count({
        where: { user_id: userId, read: false },
      });

      this.logger.log(`🔢 [NotificationService] 사용자 ${userId}의 미읽은 알림 개수: ${count}`);
      return count;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 미읽은 알림 개수 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // 읽은 알림 삭제
  async deleteReadNotifications(): Promise<number> {
    try {
      this.logger.log(`🗑️ [NotificationService] 읽은 알림 삭제 작업 시작...`);
      
      const result = await this.notificationRepository.delete({
        read: true,
      });

      const count = result.affected || 0;
      this.logger.log(`🗑️ [NotificationService] 읽은 알림 ${count}개 삭제 완료`);
      
      return count;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 읽은 알림 삭제 실패: ${error.message}`);
      throw error;
    }
  }

  // 오래된 알림 삭제 (선택적)
  async deleteOldNotifications(days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await this.notificationRepository.delete({
        created_at: { $lt: cutoffDate } as any,
      });

      const count = result.affected || 0;
      this.logger.log(`🗑️ [NotificationService] ${days}일 이전 알림 ${count}개 삭제 완료`);
      
      return count;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 오래된 알림 삭제 실패: ${error.message}`);
      throw error;
    }
  }
} 