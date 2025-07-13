import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpstreamCommentService } from './upstream-comment.service';
import { UpstreamCommentController } from './upstream-comment.controller';
import { UpstreamComment } from './upstream-comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UpstreamComment])],
  controllers: [UpstreamCommentController],
  providers: [UpstreamCommentService],
  exports: [UpstreamCommentService],
})
export class UpstreamCommentModule {}
