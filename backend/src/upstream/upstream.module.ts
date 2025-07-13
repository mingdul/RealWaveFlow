import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpstreamService } from './upstream.service';
import { UpstreamController } from './upstream.controller';
import { Upstream } from './upstream.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Upstream])],
  controllers: [UpstreamController],
  providers: [UpstreamService],
  exports: [UpstreamService],
})
export class UpstreamModule {}
