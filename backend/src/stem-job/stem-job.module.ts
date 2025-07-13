import { Module } from '@nestjs/common';
import { StemJobService } from './stem-job.service';
import { StemJobController } from './stem-job.controller';

@Module({
  controllers: [StemJobController],
  providers: [StemJobService],
})
export class StemJobModule {}
