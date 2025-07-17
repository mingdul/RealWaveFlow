import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StageService } from './stage.service';
import { StageController } from './stage.controller';
import { Stage } from './stage.entity';
import { Track } from '../track/track.entity';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';
import { SqsModule } from '../sqs/sqs.module';
import { VersionStemModule } from '../version-stem/version-stem.module';
import { StageReviewerModule } from 'src/stage-reviewer/stage-reviewer.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stage, Track, TrackCollaborator]),
    SqsModule,
    VersionStemModule,
    StageReviewerModule,
    NotificationModule,
  ],
  controllers: [StageController],
  providers: [StageService],
  exports: [StageService],
})
export class StageModule {}
