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
import { StemJobModule } from './stem-job/stem-job.module';
import { StreamingModule } from './streaming/streaming.module';
import { DownloadModule } from './download/download.module';
import { InviteModule } from './invite/invite.module';

@Module({
  imports: [
    StemModule, 
    StageModule, 
    StageReviewerModule, 
    CategoryModule,
    TrackModule,
    UsersModule,
    AuthModule,
    VersionStemModule,
    UpstreamModule,
    UpstreamCommentModule,
    StemJobModule,
    StreamingModule,
    DownloadModule,
    InviteModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
