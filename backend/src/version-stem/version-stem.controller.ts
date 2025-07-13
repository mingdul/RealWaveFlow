import { Body, Controller, Post } from '@nestjs/common';
import { VersionStemService } from './version-stem.service';
import { CreateVersionStemDto } from './dto/createVersionStem.dto';

@Controller('version-stem')
export class VersionStemController {
  constructor(private readonly versionStemService: VersionStemService) {}

  @Post('create')
  async createVersionStem(@Body() createVersionStemDto: CreateVersionStemDto) {
    return this.versionStemService.createVersionStem(createVersionStemDto);
  }
}
