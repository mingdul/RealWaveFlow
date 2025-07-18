import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationCleanupService } from './notification.cleanup';
import { Notification } from './notification.entity';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    ScheduleModule.forRoot(), // Cron 스케줄링을 위한 모듈
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    UsersModule,
  ],
  providers: [NotificationGateway, NotificationService, NotificationCleanupService],
  controllers: [NotificationController],
  exports: [NotificationGateway, NotificationService],
})
export class NotificationModule {} 