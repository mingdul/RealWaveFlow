import { Module } from '@nestjs/common';
import { UpstreamReviewService } from './upstream-review.service';
import { UpstreamReviewController } from './upstream-review.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpstreamReview } from './upstream-review.entity';
import { StageReviewer } from 'src/stage-reviewer/stage-reviewer.entity';
import { Stem } from 'src/stem/stem.entity';
import { Upstream } from 'src/upstream/upstream.entity';
import { Stage } from 'src/stage/stage.entity';
import { VersionStem } from 'src/version-stem/version-stem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UpstreamReview, StageReviewer, Stem, Upstream, Stage, VersionStem])], 
  controllers: [UpstreamReviewController],
  providers: [UpstreamReviewService],
})
export class UpstreamReviewModule {}
