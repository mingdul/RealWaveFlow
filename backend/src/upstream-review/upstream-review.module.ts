import { Module } from '@nestjs/common';
import { UpstreamReviewService } from './upstream-review.service';
import { UpstreamReviewController } from './upstream-review.controller';

@Module({
  controllers: [UpstreamReviewController],
  providers: [UpstreamReviewService],
})
export class UpstreamReviewModule {}
