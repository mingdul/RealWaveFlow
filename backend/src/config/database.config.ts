import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Track } from 'src/track/track.entity';
import { TrackCollaborator } from 'src/track_collaborator/track_collaborator.entity';
import { StageReviewer } from 'src/stage-reviewer/stage-reviewer.entity';
import { Category } from 'src/category/category.entity';
import { Stem } from 'src/stem/stem.entity';
import { VersionStem } from 'src/version-stem/version-stem.entity';
import { Stage } from 'src/stage/stage.entity';
import { Upstream } from 'src/upstream/upstream.entity';
import { UpstreamComment } from 'src/upstream-comment/upstream-comment.entity';
import { UpstreamReview } from 'src/upstream-review/upstream-review.entity';


export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME, 
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User, 
    Track, 
    TrackCollaborator,
    Stage,
    StageReviewer,
    Category,
    Stem,
    VersionStem,
    Upstream,
    UpstreamComment,
    UpstreamReview,
  ],
  // 개발 단계에서는 동기화 활성화
  synchronize: true,
  // 개발 단계에서는 스키마 재생성 활성화 (주의: 데이터 삭제됨)
  dropSchema: false, // 데이터 보존을 위해 false로 설정
  // SSL 설정 - 환경에 따라 다르게 설정
  ssl: process.env.DB_HOST === 'postgres' ? false : {
    rejectUnauthorized: false, // 자체 서명된 인증서 허용 (RDS용)
  },
  // 연결 재시도 설정
  retryAttempts: 5,
  retryDelay: 3000,
  // 로깅 활성화 (디버깅용)
  logging: ['error', 'warn'],
};
