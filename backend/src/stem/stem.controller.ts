import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { StemService } from './stem.service';
import { CreateStemDto } from './dto/createStem.dto';

@ApiTags('stem')
@Controller('stem')
export class StemController {
  constructor(private readonly stemService: StemService) {}

  @Post('create')
  @ApiOperation({ summary: '스템 생성', description: '새로운 스템을 생성합니다.' })
  @ApiBody({ type: CreateStemDto })
  @ApiResponse({ status: 201, description: '스템 생성 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async createStem(@Body() createStemDto: CreateStemDto) {
    return this.stemService.createStem(createStemDto);
  }

  @Get('/upstream/:upstream_id/track/:track_id')
  @ApiOperation({ summary: '업스트림 스템 조회', description: '특정 업스트림과 트랙의 스템들을 조회합니다.' })
  @ApiParam({ name: 'upstream_id', description: '업스트림 ID' })
  @ApiParam({ name: 'track_id', description: '트랙 ID' })
  @ApiResponse({ status: 200, description: '업스트림 스템 조회 성공' })
  @ApiResponse({ status: 404, description: '업스트림 또는 트랙을 찾을 수 없음' })
  async getUpstreamStems(@Param('upstream_id') upstream_id: string, @Param('track_id') track_id: string) {
    return this.stemService.getUpstreamStems(upstream_id, track_id);
  }
}
