import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';
import { S3Service } from './s3.service';
import { Stem } from '../stem/stem.entity';
import { Track } from '../track/track.entity';
import { Stage } from '../stage/stage.entity';
import { VersionStem } from '../version-stem/version-stem.entity';

/**
 * Download Module
 * 
 * 음악 스템 파일들의 다운로드 URL을 제공하는 모듈
 * - 작업 중인 stems (Stem 엔티티)와 완성된 버전 stems (VersionStem 엔티티) 모두 지원
 * - 프론트엔드에서 stem 정보를 제공받아 권한만 확인하고 presigned download URL 반환
 * - S3 presigned URL을 통해 안전한 파일 다운로드 제공
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Stem, Track, Stage, VersionStem]),
  ],
  controllers: [DownloadController],
  providers: [DownloadService, S3Service],
  exports: [DownloadService],
})
export class DownloadModule {} 