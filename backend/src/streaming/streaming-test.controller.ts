import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { StreamingTestService } from './streaming-test.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Streaming Test')
@Controller('api/test')
export class StreamingTestController {
  constructor(private readonly streamingTestService: StreamingTestService) {}

  @Get('tracks/:trackId/stems')
  @ApiOperation({ summary: '[테스트] 트랙의 모든 스템 파일 Mock 데이터' })
  async getTestTrackStems(@Param('trackId') trackId: string) {
    return this.streamingTestService.getMockTrackStems(trackId);
  }

  @Get('audio/stream/:stemId')
  @ApiOperation({ summary: '[테스트] 개별 스템 파일 Mock 데이터' })
  async getTestStemStream(@Param('stemId') stemId: string) {
    return this.streamingTestService.getMockStemStream(stemId);
  }

  @Post('audio/stream/batch')
  @ApiOperation({ summary: '[테스트] 배치 스트리밍 Mock 데이터' })
  async getTestBatchStreams(@Body() body: { stemIds: string[] }) {
    return this.streamingTestService.getMockBatchStreams(body.stemIds);
  }

  @Get('health')
  @ApiOperation({ summary: '[테스트] API 상태 확인' })
  async getHealth() {
    return {
      success: true,
      message: 'Streaming API is working!',
      timestamp: new Date().toISOString(),
      environment: 'local-test',
    };
  }
}
