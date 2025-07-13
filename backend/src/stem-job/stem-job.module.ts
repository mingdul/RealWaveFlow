import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StemJobService } from './stem-job.service';
import { StemJobController } from './stem-job.controller';
import { StemJob } from './stem-job.entity';
import { Stem } from '../stem/stem.entity';
import { SqsModule } from '../sqs/sqs.module';
import { StageModule } from '../stage/stage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StemJob, Stem]),
    SqsModule,
    StageModule,
  ],
  controllers: [StemJobController],
  providers: [StemJobService],
  exports: [StemJobService],
})
export class StemJobModule {}
