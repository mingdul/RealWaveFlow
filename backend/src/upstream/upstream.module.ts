import { Module } from '@nestjs/common';
import { UpstreamService } from './upstream.service';
import { UpstreamController } from './upstream.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Upstream } from './upstream.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Upstream])],
  controllers: [UpstreamController],
  providers: [UpstreamService],
})
export class UpstreamModule {}
