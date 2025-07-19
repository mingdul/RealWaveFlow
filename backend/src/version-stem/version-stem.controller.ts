import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { VersionStemService } from './version-stem.service';
import { CreateVersionStemDto } from './dto/createVersionStem.dto';

@ApiTags('version-stem')
@Controller('version-stem')
export class VersionStemController {
  constructor(private readonly versionStemService: VersionStemService) {}

  @Post('create')
  @ApiOperation({ summary: '버전 스템 생성', description: '새로운 버전 스템을 생성합니다.' })
  @ApiBody({ type: CreateVersionStemDto })
  @ApiResponse({ status: 201, description: '버전 스템 생성 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async createVersionStem(@Body() createVersionStemDto: CreateVersionStemDto) {
    return this.versionStemService.createVersionStem(createVersionStemDto);
  }

  @Get('/track/:track_id/version-stem/:version')
  @ApiOperation({ summary: '트랙별 버전 스템 조회', description: '특정 트랙의 특정 버전 스템들을 조회합니다.' })
  @ApiParam({ name: 'track_id', description: '트랙 ID' })
  @ApiParam({ name: 'version', description: '버전 번호' })
  @ApiResponse({ status: 200, description: '버전 스템 조회 성공' })
  @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
  async getLatestStemsPerCategoryByTrack(@Param('track_id') track_id: string, @Param('version') version: number) {
    return this.versionStemService.getLatestStemsPerCategoryByTrack(track_id, version);
  }

  @Get('/stage/:stage_id')
  @ApiOperation({ summary: '스테이지별 버전 스템 조회', description: '특정 스테이지의 버전 스템들을 조회합니다.' })
  @ApiParam({ name: 'stage_id', description: '스테이지 ID' })
  @ApiResponse({ status: 200, description: '버전 스템 조회 성공' })
  @ApiResponse({ status: 404, description: '스테이지를 찾을 수 없음' })
  async getVersionStemByStageId(@Param('stage_id') stage_id: string) {
    return this.versionStemService.getVersionStemByStageId(stage_id);
  }
}
