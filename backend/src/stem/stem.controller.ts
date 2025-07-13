import { Body, Controller, Post } from '@nestjs/common';
import { StemService } from './stem.service';
import { CreateStemDto } from './dto/createStem.dto';

@Controller('stem')
export class StemController {
  constructor(private readonly stemService: StemService) {}

  @Post('create')
  async createStem(@Body() createStemDto: CreateStemDto) {
    return this.stemService.createStem(createStemDto);
  }
}
