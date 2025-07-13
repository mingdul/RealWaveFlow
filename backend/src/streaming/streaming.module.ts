import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';
import { StreamingTestController } from './streaming-test.controller';
import { StreamingTestService } from './streaming-test.service';
import { Stem } from '../stem/stem.entity';
import { Track } from '../track/track.entity';
import { Stage } from '../stage/stage.entity';
import { VersionStem } from '../version-stem/version-stem.entity';
import { Upstream } from '../upstream/upstream.entity';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';
import { User } from '../users/user.entity';
import { S3Service } from './s3.service';

/**
 * Streaming Module
 * 
 * 음악 스템 파일들의 스트리밍 기능을 제공하는 모듈
 * 
 * 주요 기능:
 * - 작업 중인 stems (Stem 엔티티) 스트리밍
 * - 완성된 버전 stems (VersionStem 엔티티) 스트리밍
 * - S3 presigned URL을 통한 안전한 파일 접근
 * - 트랙 기반 권한 검증
 * 
 * 포함된 엔티티:
 * - Stem: 작업 중인 스템 파일
 * - VersionStem: 완성된 버전의 스템 파일
 * - Track: 트랙 정보 및 권한 검증
 * - Stage: 버전 관리
 * - Upstream: 작업 중인 후보들
 * - TrackCollaborator: 협업자 정보
 * - User: 사용자 정보
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Stem, 
      Track, 
      Stage, 
      VersionStem, 
      Upstream, 
      TrackCollaborator, 
      User
    ])
  ],
  controllers: [StreamingController, StreamingTestController],
  providers: [StreamingService, StreamingTestService, S3Service],
  exports: [StreamingService, StreamingTestService, S3Service]
})
export class StreamingModule {}
