import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UpstreamService } from './upstream.service';
import { CreateUpstreamDto } from './dto/createUpstream.dto';

@ApiTags('upstream')
@Controller('upstream')
export class UpstreamController {
  constructor(private readonly upstreamService: UpstreamService) {}

  @Post('create')
  @ApiOperation({ summary: '업스트림 생성', description: '새로운 업스트림을 생성합니다.' })
  @ApiBody({ type: CreateUpstreamDto })
  @ApiResponse({ status: 201, description: '업스트림 생성 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async createUpstream(@Body() createUpstreamDto: CreateUpstreamDto) {
    return this.upstreamService.createUpstream(createUpstreamDto);
  }


  @Get('get-stage-upstreams/:stage_id')
  @ApiOperation({ summary: '스테이지의 업스트림 조회', description: '스테이지의 업스트림을 조회합니다.' })
  @ApiResponse({ status: 200, description: '업스트림 조회 성공' })
  @ApiResponse({ status: 404, description: '업스트림 없음' })
  async getStageUpstreams(@Param('stage_id') stage_id: string) {
    return this.upstreamService.getStageUpstreams(stage_id);
  }
}
