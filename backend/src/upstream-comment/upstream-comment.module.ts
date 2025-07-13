import { Module } from '@nestjs/common';
import { UpstreamCommentService } from './upstream-comment.service';
import { UpstreamCommentController } from './upstream-comment.controller';

@Module({
  controllers: [UpstreamCommentController],
  providers: [UpstreamCommentService],
})
export class UpstreamCommentModule {}
