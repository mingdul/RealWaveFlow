import { Module } from '@nestjs/common';
import { UpstreamCommentService } from './upstream-comment.service';
import { UpstreamCommentController } from './upstream-comment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpstreamComment } from './upstream-comment.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([UpstreamComment])], 
  controllers: [UpstreamCommentController],
  providers: [UpstreamCommentService],
})
export class UpstreamCommentModule {}
