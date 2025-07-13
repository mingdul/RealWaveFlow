import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BatchStreamRequestDto, TrackStemsQueryDto, StemInfoDto, BatchStemInfoRequestDto } from './dto/streaming.dto';

/**
 * Streaming Controller
 * 
 * 음악 스템 파일들의 스트리밍 URL을 제공하는 컨트롤러
 * - 작업 중인 stems (Stem 엔티티)와 완성된 버전 stems (VersionStem 엔티티) 모두 지원
 * - JWT 인증을 통한 사용자 권한 검증
 * - 트랙 소유자 또는 협업자만 접근 가능
 */
@Controller('streaming')
@UseGuards(JwtAuthGuard)
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  /**
   * 프론트엔드에서 제공받은 stem 정보로 presigned URL 생성
   * 
   * POST /streaming/stem/presigned
   * 
   * 프론트엔드에서 이미 가지고 있는 stem 정보를 제공받아
   * 권한만 확인하고 presigned URL만 반환
   */
  @Post('stem/presigned')
  async getStemPresignedUrl(
    @Body() stemInfo: StemInfoDto,
    @Request() req: any
  ) {
    return this.streamingService.getStemPresignedUrl(stemInfo, req.user.id);
  }

  /**
   * 프론트엔드에서 제공받은 stems 정보로 배치 presigned URL 생성
   * 
   * POST /streaming/stems/batch-presigned
   * 
   * 프론트엔드에서 이미 가지고 있는 stems 정보를 제공받아
   * 권한만 확인하고 presigned URL만 반환
   */
  @Post('stems/batch-presigned')
  async getBatchStemPresignedUrls(
    @Body() request: BatchStemInfoRequestDto,
    @Request() req: any
  ) {
    return this.streamingService.getBatchStemPresignedUrls(request.stems, req.user.id);
  }

  /**
   * 개별 Stem 스트리밍 URL 조회 (작업 중인 stems)
   * 
   * GET /streaming/stem/:stemId
   * 
   * Stem ID를 받아서 DB에서 정보를 조회하고 스트리밍 URL 반환
   * 메타데이터와 함께 제공
   */
  @Get('stem/:stemId')
  async getStemStreamingUrl(
    @Param('stemId') stemId: string,
    @Request() req: any
  ) {
    return this.streamingService.getStemStreamingUrl(stemId, req.user.id);
  }

  /**
   * 개별 VersionStem 스트리밍 URL 조회 (완성된 버전 stems)
   * 
   * GET /streaming/version-stem/:stemId
   * 
   * VersionStem ID를 받아서 DB에서 정보를 조회하고 스트리밍 URL 반환
   * 메타데이터와 함께 제공
   */
  @Get('version-stem/:stemId')
  async getVersionStemStreamingUrl(
    @Param('stemId') stemId: string,
    @Request() req: any
  ) {
    return this.streamingService.getVersionStemStreamingUrl(stemId, req.user.id);
  }

  /**
   * 트랙의 모든 작업 중인 stems 조회 (Upstream을 통해)
   * 
   * GET /streaming/track/:trackId/stems
   * 
   * 트랙 ID를 받아서 해당 트랙의 모든 stems를 DB에서 조회하고 스트리밍 URL 반환
   * 트랙 정보와 함께 제공
   */
  @Get('track/:trackId/stems')
  async getTrackStemsStreamingUrls(
    @Param('trackId') trackId: string,
    @Query() query: TrackStemsQueryDto,
    @Request() req: any
  ) {
    return this.streamingService.getTrackStemsStreamingUrls(
      trackId, 
      req.user.id, 
      query.version
    );
  }

  /**
   * 배치 스트리밍 - Stem과 VersionStem 모두 지원
   * 
   * POST /streaming/batch
   * 
   * Stem ID 배열을 받아서 DB에서 정보를 조회하고 스트리밍 URL 반환
   * Stem과 VersionStem ID가 혼재되어도 처리 가능
   */
  @Post('batch')
  async getBatchStreamingUrls(
    @Body() request: BatchStreamRequestDto,
    @Request() req: any
  ) {
    return this.streamingService.getBatchStreamingUrls(request.stemIds, req.user.id);
  }

  /**
   * 특정 버전의 마스터 stems 조회 (VersionStem)
   * 
   * GET /streaming/track/:trackId/version/:version/master-stems
   * 
   * 트랙 ID와 버전을 받아서 해당 버전의 모든 VersionStems를 DB에서 조회하고 스트리밍 URL 반환
   * 트랙 정보와 함께 제공
   */
  @Get('track/:trackId/version/:version/master-stems')
  async getMasterStemStreamingUrls(
    @Param('trackId') trackId: string,
    @Param('version') version: string,
    @Request() req: any
  ) {
    return this.streamingService.getMasterStemStreamingUrls(
      trackId, 
      parseInt(version), 
      req.user.id
    );
  }

  /**
   * Upstream의 stems 조회
   * 
   * GET /streaming/upstream/:upstreamId/stems
   * 
   * Upstream ID를 받아서 해당 upstream의 모든 stems를 DB에서 조회하고 스트리밍 URL 반환
   */
  @Get('upstream/:upstreamId/stems')
  async getUpstreamStemsStreamingUrls(
    @Param('upstreamId') upstreamId: string,
    @Request() req: any
  ) {
    return this.streamingService.getUpstreamStemsStreamingUrls(upstreamId, req.user.id);
  }
}
