import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationCleanupService {
  private readonly logger = new Logger(NotificationCleanupService.name);

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  // 매일 오전 3시에 오래된 읽은 알림 정리
  @Cron('0 3 * * *')
  async handleCron() {
    try {
      this.logger.log('🗑️ [NotificationCleanupService] 오래된 읽은 알림 정리 작업 시작...');
      
      const result = await this.notificationService.purgeOldRead();
      const deletedCount = result.affected || 0;
      
      this.logger.log(`🗑️ [NotificationCleanupService] 정리 완료: ${deletedCount}개 알림 삭제됨`);
    } catch (error) {
      this.logger.error(`❌ [NotificationCleanupService] 정리 작업 실패: ${error.message}`);
    }
  }
} 