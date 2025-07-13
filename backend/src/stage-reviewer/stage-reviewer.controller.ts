import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { StageReviewerService } from './stage-reviewer.service';
import { CreateStageReviewerDto } from './dto/createStageReviewer.dto';

@ApiTags('stage-reviewer')
@Controller('stage-reviewer')
export class StageReviewerController {
  constructor(private readonly stageReviewerService: StageReviewerService) {}

  @Post('create')
  @ApiOperation({ summary: '스테이지 리뷰어 생성', description: '새로운 스테이지 리뷰어를 생성합니다.' })
  @ApiBody({ type: CreateStageReviewerDto })
  @ApiResponse({ status: 201, description: '스테이지 리뷰어 생성 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async createStageReviewer(@Body() createStageReviewerDto: CreateStageReviewerDto) {
    return this.stageReviewerService.createStageReviewer(createStageReviewerDto);
  }

  @Get('/:stage_id')
  @ApiOperation({ summary: '스테이지 리뷰어 조회', description: '특정 스테이지의 리뷰어들을 조회합니다.' })
  @ApiParam({ name: 'stage_id', description: '스테이지 ID' })
  @ApiResponse({ status: 200, description: '스테이지 리뷰어 조회 성공' })
  @ApiResponse({ status: 404, description: '스테이지를 찾을 수 없음' })
  async getStageReviewers(@Param('stage_id') stage_id: string) {
    return this.stageReviewerService.getStageReviewers(stage_id);
  }
}
