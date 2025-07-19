import { Controller, Get, Patch, Param, UseGuards, Request, Logger, Query, BadRequestException, UnauthorizedException } from '@nestjs/common';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { Notification } from './notification.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  // 사용자의 알림 조회 (limit 지원)
  @Get()
  async getUserNotifications(
    @Request() req: any,
    @Query('limit') limitQuery?: string
  ): Promise<Notification[]> {
    try {
      // 사용자 인증 확인 (JWT payload의 sub 또는 id)
      const userId = req.user?.id || req.user?.sub;
      
      this.logger.log(`📋 [NotificationController] 사용자 ${userId}의 알림 조회 요청`);
      this.logger.log(`📋 [NotificationController] req.user:`, JSON.stringify(req.user, null, 2));

      if (!userId) {
        this.logger.error(`❌ [NotificationController] User ID not found in request. req.user: ${JSON.stringify(req.user)}`);
        throw new UnauthorizedException('User authentication required');
      }

      // limit 파라미터 파싱 및 기본값 적용
      let limit = 50; // 기본값
      if (limitQuery) {
        const parsedLimit = parseInt(limitQuery, 10);
        if (isNaN(parsedLimit) || parsedLimit <= 0) {
          throw new BadRequestException('Limit must be a positive number');
        }
        if (parsedLimit > 1000) {
          throw new BadRequestException('Limit cannot exceed 1000');
        }
        limit = parsedLimit;
      }

      this.logger.log(`📋 [NotificationController] Limit: ${limit}`);

      const notifications = await this.notificationService.getUserNotifications(userId, limit);

      this.logger.log(`📋 [NotificationController] 사용자 ${userId}의 알림 ${notifications.length}개 조회 완료`);
      return notifications;
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 알림 조회 실패: ${error.message}`);
      
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      
      // 기타 예외는 내부 서버 에러로 처리
      throw new BadRequestException('Failed to retrieve notifications');
    }
  }

  // 특정 알림을 읽음으로 표시
  @Patch(':id/read')
  async markAsRead(@Param('id') notificationId: string, @Request() req: any): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User authentication required');
      }
      
      this.logger.log(`📖 [NotificationController] 알림 읽음 처리 요청: ${notificationId} by user ${userId}`);

      await this.notificationService.markRead(notificationId);

      this.logger.log(`📖 [NotificationController] 알림 읽음 처리 완료: ${notificationId}`);
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 알림 읽음 처리 실패: ${error.message}`);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to mark notification as read');
    }
  }

  // 사용자의 모든 미읽은 알림을 읽음으로 표시
  @Patch('mark-all-read')
  async markAllRead(@Request() req: any): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const userId = req.user?.id || req.user?.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User authentication required');
      }
      
      this.logger.log(`📖 [NotificationController] 모든 알림 읽음 처리 요청 by user ${userId}`);

      const result = await this.notificationService.markAllRead(userId);
      const count = result.affected || 0;

      this.logger.log(`📖 [NotificationController] 모든 알림 읽음 처리 완료: ${count}개`);
      
      return {
        success: true,
        message: `${count}개의 알림을 모두 읽음으로 표시했습니다.`,
        count
      };
    } catch (error) {
      this.logger.error(`❌ [NotificationController] 모든 알림 읽음 처리 실패: ${error.message}`);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to mark all notifications as read');
    }
  }
} 