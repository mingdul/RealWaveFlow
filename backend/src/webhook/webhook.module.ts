import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { SqsModule } from 'src/sqs/sqs.module';
import { WebSocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    SqsModule,
    WebSocketModule,
  ],
  controllers: [WebhookController]
})
export class WebhookModule {}
