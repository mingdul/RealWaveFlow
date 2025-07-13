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
import { UpstreamReviewModule } from './upstream-review/upstream-review.module';
import { StreamingModule } from './streaming/streaming.module';
import { DownloadModule } from './download/download.module';
import { InviteModule } from './invite/invite.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { SqsModule } from './sqs/sqs.module';
import { EmailModule } from './email/email.module';
import { WebhookModule } from './webhook/webhook.module';
import { TrackCollaboratorModule } from './track_collaborator/track_collaborator.module';
import { WebSocketModule } from './websocket/websocket.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true,  envFilePath: '.env' }),
    TypeOrmModule.forRoot(databaseConfig),
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
    UpstreamReviewModule,
    StreamingModule,
    DownloadModule,
    InviteModule,
    SqsModule,
    EmailModule,
    WebhookModule,
    StemJobModule,
    TrackCollaboratorModule,
    WebSocketModule,

  ], // 추후 다른 모듈들 (예: AuthModule 등)을 여기에 추가
    controllers: [], // 라우팅 처리
  providers: [], // 비즈니스 로직/서비스 제공
})
export class AppModule {}
