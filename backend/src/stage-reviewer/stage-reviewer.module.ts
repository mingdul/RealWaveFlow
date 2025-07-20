import { Module } from '@nestjs/common';
import { StageReviewerService } from './stage-reviewer.service';
import { StageReviewerController } from './stage-reviewer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StageReviewer } from './stage-reviewer.entity';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StageReviewer, TrackCollaborator])],
  controllers: [StageReviewerController],
  providers: [StageReviewerService],
  exports: [StageReviewerService],
})
export class StageReviewerModule {}
