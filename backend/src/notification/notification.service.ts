import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult, LessThan } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  // 알림 생성
  async create(userId: string, type: string, message: string, data?: any): Promise<Notification> {
    try {
      const notification = this.notificationRepository.create({
        userId,
        type,
        message,
        data,
        isRead: false,
      });

      const savedNotification = await this.notificationRepository.save(notification);
      this.logger.log(`💾 [NotificationService] 알림 생성 완료: ${savedNotification.id} for user ${userId}`);
      
      return savedNotification;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 알림 생성 실패: ${error.message}`);
      throw error;
    }
  }

  // 사용자의 모든 알림 조회
  async findAllForUser(userId: string): Promise<Notification[]> {
    try {
      const notifications = await this.notificationRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      this.logger.log(`📋 [NotificationService] 사용자 ${userId}의 알림 ${notifications.length}개 조회 완료`);
      return notifications;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 알림 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // 특정 알림을 읽음으로 표시
  async markRead(id: string): Promise<UpdateResult> {
    try {
      const result = await this.notificationRepository.update(
        { id },
        { isRead: true }
      );

      this.logger.log(`📖 [NotificationService] 알림 읽음 처리 완료: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 알림 읽음 처리 실패: ${error.message}`);
      throw error;
    }
  }

  // 오래된 읽은 알림 삭제 (7일 이전)
  async purgeOldRead(): Promise<DeleteResult> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const result = await this.notificationRepository.delete({
        isRead: true,
        createdAt: LessThan(cutoffDate),
      });

      const count = result.affected || 0;
      this.logger.log(`🗑️ [NotificationService] 오래된 읽은 알림 ${count}개 삭제 완료`);
      
      return result;
    } catch (error) {
      this.logger.error(`❌ [NotificationService] 오래된 알림 삭제 실패: ${error.message}`);
      throw error;
    }
  }
} 