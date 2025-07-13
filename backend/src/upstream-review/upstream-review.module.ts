import { Module } from '@nestjs/common';
import { UpstreamReviewService } from './upstream-review.service';
import { UpstreamReviewController } from './upstream-review.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpstreamReview } from './upstream-review.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([UpstreamReview])], 
  controllers: [UpstreamReviewController],
  providers: [UpstreamReviewService],
})
export class UpstreamReviewModule {}
