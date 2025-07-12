import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { TrackModule } from './track/track.module';
import { TrackCollaboratorModule } from './track_collaborator/track_collaborator.module';
import { StemFileModule } from './stem-file/stem-file.module';
import { UploadModule } from './upload/upload.module';
import { HealthModule } from './health/health.module';
import { SqsModule } from './sqs/sqs.module';
import { WebSocketModule } from './websocket/websocket.module';
import { CategoryModule } from './category/category.module';
import { SessionModule } from './session/session.module';
import { SessionBestModule } from './session-best/session-best.module';
import { MasterTakeModule } from './master-take/master-take.module';
import { MasterStemModule } from './master-stem/master-stem.module';
// import { SqsModule } from './sqs/sqs.module';
import { StreamingModule } from './streaming/streaming.module';
import { InviteModule } from './invite/invite.module';

import { DropModule } from './drop/drop.module';
import { DropReviewerModule } from './drop-reviewer/drop-reviewer.module';
import { DropSelectionModule } from './drop-selection/drop-selection.module';
import { DropCommentModule } from './drop-comment/drop-comment.module';
import { EmailModule } from './email/email.module';
import { WebhookModule } from './webhook/webhook.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true,  envFilePath: '.env' }),
    TypeOrmModule.forRoot(databaseConfig),
    UsersModule,
    AuthModule,
    TrackModule,
    TrackCollaboratorModule,
    StemFileModule,
    UploadModule,
    HealthModule,
    SqsModule,
    WebSocketModule,
    CategoryModule,
    SessionModule,
    SessionBestModule,
    MasterTakeModule,
    MasterStemModule,
    StreamingModule,
    InviteModule,
    EmailModule,
    DropModule,
    DropReviewerModule,
    DropSelectionModule,
    DropCommentModule,
    EmailModule,
    WebhookModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}