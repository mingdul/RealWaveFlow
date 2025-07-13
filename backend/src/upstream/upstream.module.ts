import { Module } from '@nestjs/common';
import { UpstreamService } from './upstream.service';
import { UpstreamController } from './upstream.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Upstream } from './upstream.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Upstream])],
  controllers: [UpstreamController],
  providers: [UpstreamService],
})
export class UpstreamModule {}
