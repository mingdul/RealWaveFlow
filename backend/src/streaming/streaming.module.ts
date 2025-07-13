import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';
import { StreamingTestController } from './streaming-test.controller';
import { StreamingTestService } from './streaming-test.service';
import { StemFile } from '../stem-file/stem-file.entity';
import { Track } from '../track/track.entity';
import { MasterStem } from '../master-stem/master-stem.entity';
import { S3Service } from './s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StemFile, Track, MasterStem])
  ],
  controllers: [StreamingController, StreamingTestController],
  providers: [StreamingService, StreamingTestService, S3Service],
  exports: [StreamingService, StreamingTestService, S3Service]
})
export class StreamingModule {}
