import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StageService } from './stage.service';
import { CreateStageDto } from './dto/createStage.dto';

@Controller('stage')
export class StageController {
  constructor(private readonly stageService: StageService) {}

  @Post('create')
  async createStage(@Body() createStageDto: CreateStageDto) {
    return this.stageService.createStage(createStageDto);
  }

  @Get('/track/:track_id')
  async getTrackStages(@Param('track_id') track_id: string) {
    return this.stageService.getTrackStages(track_id);
  }

  @Get('/stage/:stage_id')
  async getStage(@Param('stage_id') stage_id: string) {
    return this.stageService.getStage(stage_id);
  }
}
