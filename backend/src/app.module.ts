import { Module } from '@nestjs/common';
import { StemModule } from './stem/stem.module';
import { StageModule } from './stage/stage.module';
import { StageReviewerModule } from './stage-reviewer/stage-reviewer.module';
import { CategoryModule } from './category/category.module';
import { TrackModule } from './track/track.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VersionStemModule } from './version-stem/version-stem.module';
import { UpstreamModule } from './upstream/upstream.module';
import { UpstreamCommentModule } from './upstream-comment/upstream-comment.module';

@Module({
  imports: [StemModule, 
    StageModule, 
    StageReviewerModule, 
    CategoryModule,
    TrackModule,
    UsersModule,
    AuthModule,
    VersionStemModule,
    UpstreamModule,
    UpstreamCommentModule,

  ], // 추후 다른 모듈들 (예: AuthModule 등)을 여기에 추가
    controllers: [], // 라우팅 처리
  providers: [], // 비즈니스 로직/서비스 제공
})
export class AppModule {}
