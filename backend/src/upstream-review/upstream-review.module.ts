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
import { TrackCollaborator } from 'src/track_collaborator/track_collaborator.entity';
import { Track } from 'src/track/track.entity';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UpstreamReview, 
      StageReviewer, 
      Stem, 
      Upstream, 
      Stage, 
      VersionStem,
      TrackCollaborator,
      Track
    ]),
    NotificationModule, // 알림 기능을 위해 추가
  ], 
  controllers: [UpstreamReviewController],
  providers: [UpstreamReviewService],
  exports: [UpstreamReviewService],
})
export class UpstreamReviewModule {}
