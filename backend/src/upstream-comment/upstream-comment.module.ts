import { Module } from '@nestjs/common';
import { UpstreamCommentService } from './upstream-comment.service';
import { UpstreamCommentController } from './upstream-comment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpstreamComment } from './upstream-comment.entity';
import { Upstream } from '../upstream/upstream.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UpstreamComment, Upstream]),
    NotificationModule,
  ], 
  controllers: [UpstreamCommentController],
  providers: [UpstreamCommentService],
})
export class UpstreamCommentModule {}
