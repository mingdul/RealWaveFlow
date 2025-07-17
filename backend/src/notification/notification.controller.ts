import { Controller, Get, Patch, Param, UseGuards, Req, Query, Logger, Post } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { NotificationScheduler } from './notification.scheduler';
import { Request } from 'express';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  // 사용자의 모든 알림 조회
  @Get()
  async getUserNotifications(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('unread') unread?: string,
  ) {
    try {
      const userId = (req as any).user.id;
      this.logger.log(`📋 [NotificationController] 사용자 ${userId}의 알림 조회 요청`);

      let notifications;
      
      if (unread === 'true') {
        // 미읽은 알림만 조회
        notifications = await this.notificationService.getUserUnreadNotifications(userId);
      } else {
        // 모든 알림 조회 (limit 적용)
        const limitNum = limit ? parseInt(limit, 10) : 50;
        notifications = await this.notificationService.getUserNotifications(userId, limitNum);
      }

      // 미읽은 알림 개수도 함께 반환
      const unreadCount = await this.notificationService.getUnreadCount(userId);

      return {
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          notifications,
          unreadCount,
          totalCount: notifications.length,
        },
      };
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 알림 조회 실패: ${error.message}`);
      return {
        success: false,
        message: 'Failed to retrieve notifications',
        error: error.message,
      };
    }
  }

  // 미읽은 알림 개수 조회
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    try {
      const userId = (req as any).user.id;
      this.logger.log(`🔢 [NotificationController] 사용자 ${userId}의 미읽은 알림 개수 조회 요청`);

      const count = await this.notificationService.getUnreadCount(userId);

      return {
        success: true,
        message: 'Unread count retrieved successfully',
        data: { unreadCount: count },
      };
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 미읽은 알림 개수 조회 실패: ${error.message}`);
      return {
        success: false,
        message: 'Failed to retrieve unread count',
        error: error.message,
      };
    }
  }

  // 특정 알림을 읽음으로 표시
  @Patch(':id/read')
  async markAsRead(@Param('id') notificationId: string, @Req() req: Request) {
    try {
      const userId = (req as any).user.id;
      this.logger.log(`📖 [NotificationController] 알림 읽음 처리 요청: ${notificationId} by user ${userId}`);

      const success = await this.notificationService.markAsRead(notificationId, userId);

      if (success) {
        return {
          success: true,
          message: 'Notification marked as read successfully',
        };
      } else {
        return {
          success: false,
          message: 'Notification not found or already read',
        };
      }
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 알림 읽음 처리 실패: ${error.message}`);
      return {
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message,
      };
    }
  }

  // 모든 알림을 읽음으로 표시
  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: Request) {
    try {
      const userId = (req as any).user.id;
      this.logger.log(`📖 [NotificationController] 모든 알림 읽음 처리 요청 by user ${userId}`);

      const count = await this.notificationService.markAllAsRead(userId);

      return {
        success: true,
        message: `${count} notifications marked as read successfully`,
        data: { updatedCount: count },
      };
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 모든 알림 읽음 처리 실패: ${error.message}`);
      return {
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message,
      };
    }
  }

  // 읽은 알림 수동 삭제 (관리자용)
  @Post('cleanup/read')
  async cleanupReadNotifications(@Req() req: Request) {
    try {
      const userId = (req as any).user.id;
      this.logger.log(`🗑️ [NotificationController] 읽은 알림 수동 삭제 요청 by user ${userId}`);

      const deletedCount = await this.notificationService.deleteReadNotifications();

      return {
        success: true,
        message: `${deletedCount} read notifications deleted successfully`,
        data: { deletedCount },
      };
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 읽은 알림 삭제 실패: ${error.message}`);
      return {
        success: false,
        message: 'Failed to delete read notifications',
        error: error.message,
      };
    }
  }

  // 전체 알림 정리 (관리자용)
  @Post('cleanup/all')
  async manualCleanup(@Req() req: Request) {
    try {
      const userId = (req as any).user.id;
      this.logger.log(`🗑️ [NotificationController] 전체 알림 정리 요청 by user ${userId}`);

      const result = await this.notificationScheduler.manualCleanup();

      return {
        success: true,
        message: `Manual cleanup completed successfully`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 전체 알림 정리 실패: ${error.message}`);
      return {
        success: false,
        message: 'Failed to perform manual cleanup',
        error: error.message,
      };
    }
  }
} 