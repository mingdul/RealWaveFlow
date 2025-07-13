import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { StageService } from './stage.service';
import { CreateStageDto } from './dto/createStage.dto';

@ApiTags('stage')
@Controller('stage')
export class StageController {
  constructor(private readonly stageService: StageService) {}

  @Post('create')
  @ApiOperation({ summary: '스테이지 생성', description: '새로운 스테이지를 생성합니다.' })
  @ApiBody({ type: CreateStageDto })
  @ApiResponse({ status: 201, description: '스테이지 생성 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async createStage(@Body() createStageDto: CreateStageDto) {
    return this.stageService.createStage(createStageDto);
  }

  @Get('/track/:track_id')
  @ApiOperation({ summary: '트랙 스테이지 조회', description: '특정 트랙의 모든 스테이지를 조회합니다.' })
  @ApiParam({ name: 'track_id', description: '트랙 ID' })
  @ApiResponse({ status: 200, description: '트랙 스테이지 조회 성공' })
  @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
  async getTrackStages(@Param('track_id') track_id: string) {
    return this.stageService.getTrackStages(track_id);
  }

  @Get('/stage/:stage_id')
  @ApiOperation({ summary: '스테이지 상세 조회', description: '특정 스테이지의 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'stage_id', description: '스테이지 ID' })
  @ApiResponse({ status: 200, description: '스테이지 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '스테이지를 찾을 수 없음' })
  async getStage(@Param('stage_id') stage_id: string) {
    return this.stageService.getStage(stage_id);
  }
}
