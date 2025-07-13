import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StreamingService } from './streaming.service';
import { BatchStreamRequestDto, TrackStemsQueryDto, StreamingResponse } from './dto/streaming.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Streaming')
@ApiBearerAuth()
@Controller('api')
@UseGuards(AuthGuard('jwt'))
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get('audio/stream/:stemId')
  @ApiOperation({ summary: '개별 스템 파일 스트리밍 URL 조회' })
  @ApiResponse({ status: 200, description: '스트리밍 URL 반환 성공' })
  @ApiResponse({ status: 404, description: '스템 파일을 찾을 수 없음' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  async getStemStream(
    @Param('stemId') stemId: string,
    @Request() req: any,
  ): Promise<StreamingResponse> {
    try {
      const result = await this.streamingService.getStemStreamingUrl(
        stemId,
        req.user.id,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('tracks/:trackId/stems')
  @ApiOperation({ summary: '트랙의 모든 스템 파일 스트리밍 URL 조회' })
  @ApiResponse({ status: 200, description: '트랙 스템 목록 반환 성공' })
  @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  async getTrackStems(
    @Param('trackId') trackId: string,
    @Query() query: TrackStemsQueryDto,
    @Request() req: any,
  ): Promise<StreamingResponse> {
    try {
      const result = await this.streamingService.getTrackStemsStreamingUrls(
        trackId,
        req.user.id,
        query.version,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('sessions/:sessionId/stems')
  @ApiOperation({ summary: '세션의 스템 파일들 스트리밍 URL 조회' })
  @ApiResponse({ status: 200, description: '세션 스템 목록 반환 성공' })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  async getSessionStems(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ): Promise<StreamingResponse> {
    try {
      const result = await this.streamingService.getSessionStemsStreamingUrls(
        sessionId,
        req.user.id,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('tracks/:trackId/master-stems/:take')
  @ApiOperation({ summary: '특정 take의 마스터 스템 파일들 스트리밍 URL 조회' })
  @ApiResponse({ status: 200, description: '마스터 스템 스트리밍 URL 반환 성공' })
  @ApiResponse({ status: 404, description: '마스터 스템 파일을 찾을 수 없음' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  async getMasterStemStreams(
    @Param('trackId') trackId: string,
    @Param('take') take: string,
    @Request() req: any,
  ): Promise<StreamingResponse> {
    try {
      const result = await this.streamingService.getMasterStemStreamingUrls(
        trackId,
        parseInt(take),
        req.user.id,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post('audio/stream/batch')
  @ApiOperation({ summary: '여러 스템 파일 스트리밍 URL 일괄 조회' })
  @ApiResponse({ status: 200, description: '배치 스트리밍 URL 반환 성공' })
  @ApiResponse({ status: 404, description: '스템 파일들을 찾을 수 없음' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  async getBatchStreams(
    @Body() batchRequest: BatchStreamRequestDto,
    @Request() req: any,
  ): Promise<StreamingResponse> {
    try {
      const result = await this.streamingService.getBatchStreamingUrls(
        batchRequest.stemIds,
        req.user.id,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
