import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StemJobService } from './stem-job.service';
import { StemJobController } from './stem-job.controller';
import { StemJob } from './stem-job.entity';
import { Stem } from '../stem/stem.entity';
import { VersionStem } from '../version-stem/version-stem.entity';
import { Stage } from '../stage/stage.entity';
import { SqsModule } from '../sqs/sqs.module';
import { StageModule } from '../stage/stage.module';
import { TrackModule } from '../track/track.module';
import { VersionStemModule } from '../version-stem/version-stem.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StemJob, Stem, VersionStem, Stage]),
    SqsModule,
    StageModule,
    TrackModule,
    VersionStemModule,
  ],
  controllers: [StemJobController],
  providers: [StemJobService],
  exports: [StemJobService],
})
export class StemJobModule {}
