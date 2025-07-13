import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { VersionStemService } from './version-stem.service';
import { CreateVersionStemDto } from './dto/createVersionStem.dto';

@Controller('version-stem')
export class VersionStemController {
  constructor(private readonly versionStemService: VersionStemService) {}

  @Post('create')
  async createVersionStem(@Body() createVersionStemDto: CreateVersionStemDto) {
    return this.versionStemService.createVersionStem(createVersionStemDto);
  }

  @Get('/track/:track_id/version-stem/:version')
  async getLatestStemsPerCategoryByTrack(@Param('track_id') track_id: string, @Param('version') version: number) {
    return this.versionStemService.getLatestStemsPerCategoryByTrack(track_id, version);
  }
}
