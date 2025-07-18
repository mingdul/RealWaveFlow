import { Controller, Get, Patch, Param, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { Notification } from './notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  // 사용자의 모든 알림 조회
  @Get()
  async getUserNotifications(@Request() req: any): Promise<Notification[]> {
    try {
      const userId = req.user?.id;
      this.logger.log(`📋 [NotificationController] 사용자 ${userId}의 알림 조회 요청`);

      if (!userId) {
        throw new Error('User ID not found in request');
      }

      const notifications = await this.notificationService.findAllForUser(userId);

      this.logger.log(`📋 [NotificationController] 사용자 ${userId}의 알림 ${notifications.length}개 조회 완료`);
      return notifications;
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 알림 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // 특정 알림을 읽음으로 표시
  @Patch(':id/read')
  async markAsRead(@Param('id') notificationId: string, @Request() req: any): Promise<void> {
    try {
      const userId = req.user.id;
      this.logger.log(`📖 [NotificationController] 알림 읽음 처리 요청: ${notificationId} by user ${userId}`);

      await this.notificationService.markRead(notificationId);

      this.logger.log(`📖 [NotificationController] 알림 읽음 처리 완료: ${notificationId}`);
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 알림 읽음 처리 실패: ${error.message}`);
      throw error;
    }
  }
} 