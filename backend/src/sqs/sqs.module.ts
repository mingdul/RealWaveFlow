import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqsService } from './service/sqs.service';
import { ConsumerService } from './consumer/consumer.service';
import { SQSClient } from '@aws-sdk/client-sqs';

@Module({
  providers: [
    SqsService,
    ConsumerService,
    {
      provide: 'SQS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new SQSClient({
          region: configService.get('AWS_REGION'),
        });
      },
    },
  ],
  exports: [SqsService]
})
export class SqsModule {}
