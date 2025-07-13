import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StemJobService } from './stem-job.service';
import { StemJobController } from './stem-job.controller';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [StemJobController],
  providers: [StemJobService],
  exports: [StemJobService],
})
export class StemJobModule {}
