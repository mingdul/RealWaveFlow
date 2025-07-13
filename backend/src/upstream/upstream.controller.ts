import { Body, Controller, Post } from '@nestjs/common';
import { UpstreamService } from './upstream.service';
import { CreateUpstreamDto } from './dto/createUpstream.dto';

@Controller('upstream')
export class UpstreamController {
  constructor(private readonly upstreamService: UpstreamService) {}

  @Post('create')
  async createUpstream(@Body() createUpstreamDto: CreateUpstreamDto) {
    return this.upstreamService.createUpstream(createUpstreamDto);
  }
}
