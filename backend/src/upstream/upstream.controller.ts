import { Body, Controller, Post } from '@nestjs/common';
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
}
