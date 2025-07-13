import { Module } from '@nestjs/common';
import { UpstreamService } from './upstream.service';
import { UpstreamController } from './upstream.controller';

@Module({
  controllers: [UpstreamController],
  providers: [UpstreamService],
})
export class UpstreamModule {}
