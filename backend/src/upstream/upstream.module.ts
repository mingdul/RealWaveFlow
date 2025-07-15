import { Module } from '@nestjs/common';
import { UpstreamService } from './upstream.service';
import { UpstreamController } from './upstream.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Upstream } from './upstream.entity';
import { UpstreamReviewModule } from 'src/upstream-review/upstream-review.module';
import { StageReviewerModule } from 'src/stage-reviewer/stage-reviewer.module';

@Module({
  imports: [TypeOrmModule.forFeature([Upstream]), UpstreamReviewModule, StageReviewerModule],
  controllers: [UpstreamController],
  providers: [UpstreamService],
})
export class UpstreamModule {}
