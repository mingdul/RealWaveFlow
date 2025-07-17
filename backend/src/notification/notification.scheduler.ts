import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(private readonly notificationService: NotificationService) {}

  // 매일 오전 3시에 읽은 알림 삭제 (서버 부하가 적은 시간)
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyNotificationCleanup() {
    try {
      this.logger.log('🕐 [NotificationScheduler] 매일 알림 정리 작업 시작...');
      
      const deletedCount = await this.notificationService.deleteReadNotifications();
      
      this.logger.log(`✅ [NotificationScheduler] 매일 알림 정리 완료 - ${deletedCount}개의 읽은 알림 삭제`);
      
      // 성과 로그 (통계 목적)
      if (deletedCount > 0) {
        this.logger.log(`📊 [NotificationScheduler] 정리 통계: ${deletedCount}개 알림 정리됨`);
      } else {
        this.logger.log(`📊 [NotificationScheduler] 정리 통계: 삭제할 읽은 알림 없음`);
      }
    } catch (error) {
      this.logger.error(`❌ [NotificationScheduler] 매일 알림 정리 실패: ${error.message}`);
      this.logger.error(`❌ [NotificationScheduler] 에러 스택:`, error.stack);
    }
  }

  // 매주 일요일 오전 4시에 30일 이상된 알림 삭제 (추가 정리)
  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyNotificationCleanup() {
    try {
      this.logger.log('📅 [NotificationScheduler] 주간 알림 정리 작업 시작...');
      
      const deletedCount = await this.notificationService.deleteOldNotifications(30);
      
      this.logger.log(`✅ [NotificationScheduler] 주간 알림 정리 완료 - ${deletedCount}개의 오래된 알림 삭제`);
      
      // 성과 로그 (통계 목적)
      if (deletedCount > 0) {
        this.logger.log(`📊 [NotificationScheduler] 주간 정리 통계: ${deletedCount}개 오래된 알림 정리됨`);
      } else {
        this.logger.log(`📊 [NotificationScheduler] 주간 정리 통계: 삭제할 오래된 알림 없음`);
      }
    } catch (error) {
      this.logger.error(`❌ [NotificationScheduler] 주간 알림 정리 실패: ${error.message}`);
      this.logger.error(`❌ [NotificationScheduler] 에러 스택:`, error.stack);
    }
  }

  // 수동 정리 메서드 (필요 시 호출)
  async manualCleanup() {
    try {
      this.logger.log('🔧 [NotificationScheduler] 수동 알림 정리 작업 시작...');
      
      const readDeletedCount = await this.notificationService.deleteReadNotifications();
      const oldDeletedCount = await this.notificationService.deleteOldNotifications(30);
      
      this.logger.log(`✅ [NotificationScheduler] 수동 정리 완료 - 읽은 알림: ${readDeletedCount}개, 오래된 알림: ${oldDeletedCount}개 삭제`);
      
      return {
        readNotificationsDeleted: readDeletedCount,
        oldNotificationsDeleted: oldDeletedCount,
        totalDeleted: readDeletedCount + oldDeletedCount,
      };
    } catch (error) {
      this.logger.error(`❌ [NotificationScheduler] 수동 알림 정리 실패: ${error.message}`);
      throw error;
    }
  }
} 