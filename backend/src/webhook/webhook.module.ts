import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { StemFileModule } from 'src/stem-file/stem-file.module';
import { SqsModule } from 'src/sqs/sqs.module';
import { WebSocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    StemFileModule,
    SqsModule,
    WebSocketModule,
  ],
  controllers: [WebhookController]
})
export class WebhookModule {}
