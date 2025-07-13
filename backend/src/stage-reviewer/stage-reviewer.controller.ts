import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StageReviewerService } from './stage-reviewer.service';
import { CreateStageReviewerDto } from './dto/createStageReviewer.dto';

@Controller('stage-reviewer')
export class StageReviewerController {
  constructor(private readonly stageReviewerService: StageReviewerService) {}

  @Post('create')
  async createStageReviewer(@Body() createStageReviewerDto: CreateStageReviewerDto) {
    return this.stageReviewerService.createStageReviewer(createStageReviewerDto);
  }

  @Get('/:stage_id')
  async getStageReviewers(@Param('stage_id') stage_id: string) {
    return this.stageReviewerService.getStageReviewers(stage_id);
  }
}
