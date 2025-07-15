import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { StemJobModule } from 'src/stem-job/stem-job.module';
import { StageModule } from 'src/stage/stage.module';
import { CategoryModule } from 'src/category/category.module';
import { SqsModule } from 'src/sqs/sqs.module';
import { WebSocketModule } from 'src/websocket/websocket.module';
import { GuideModule } from 'src/guide/guide.module';
import { UpstreamModule } from 'src/upstream/upstream.module';

@Module({
  imports: [
    StemJobModule,
    StageModule,
    CategoryModule,
    SqsModule,
    WebSocketModule,
    GuideModule,
    UpstreamModule,
  ],
  controllers: [WebhookController]
})
export class WebhookModule {}
