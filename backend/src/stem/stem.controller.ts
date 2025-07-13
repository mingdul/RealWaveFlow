import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StemService } from './stem.service';
import { CreateStemDto } from './dto/createStem.dto';

@Controller('stem')
export class StemController {
  constructor(private readonly stemService: StemService) {}

  @Post('create')
  async createStem(@Body() createStemDto: CreateStemDto) {
    return this.stemService.createStem(createStemDto);
  }


  @Get('/upstream/:upstream_id/track/:track_id')
  async getUpstreamStems(@Param('upstream_id') upstream_id: string, @Param('track_id') track_id: string) {
    return this.stemService.getUpstreamStems(upstream_id, track_id);
  }
}
