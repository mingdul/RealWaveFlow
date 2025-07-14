import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { StreamingService } from './streaming.service';
import { BatchStreamRequestDto, TrackStemsQueryDto, StemInfoDto, BatchStemInfoRequestDto } from './dto/streaming.dto';
import { AuthGuard } from '@nestjs/passport';

/**
 * Streaming Controller
 * 
 * 음악 스템 파일들의 스트리밍 URL을 제공하는 컨트롤러
 * - 작업 중인 stems (Stem 엔티티)와 완성된 버전 stems (VersionStem 엔티티) 모두 지원
 * - JWT 인증을 통한 사용자 권한 검증
 * - 트랙 소유자 또는 협업자만 접근 가능
 */
@ApiTags('streaming')
@ApiBearerAuth()
@Controller('streaming')
@UseGuards(AuthGuard('jwt'))
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
  @ApiOperation({ summary: '스템 스트리밍 URL 생성', description: '프론트엔드에서 제공받은 stem 정보로 presigned streaming URL을 생성합니다.' })
  @ApiBody({ type: StemInfoDto })
  @ApiResponse({ status: 200, description: '스트리밍 URL 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
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
  @ApiOperation({ summary: '배치 스템 스트리밍 URL 생성', description: '여러 stem 정보로 배치 presigned streaming URL을 생성합니다.' })
  @ApiBody({ type: BatchStemInfoRequestDto })
  @ApiResponse({ status: 200, description: '배치 스트리밍 URL 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
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
  @ApiOperation({ summary: '스템 스트리밍 URL 조회', description: 'Stem ID로 스트리밍 URL을 조회합니다.' })
  @ApiParam({ name: 'stemId', description: 'Stem ID' })
  @ApiResponse({ status: 200, description: '스템 스트리밍 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'Stem을 찾을 수 없음' })
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
  @ApiOperation({ summary: '버전 스템 스트리밍 URL 조회', description: 'VersionStem ID로 스트리밍 URL을 조회합니다.' })
  @ApiParam({ name: 'stemId', description: 'VersionStem ID' })
  @ApiResponse({ status: 200, description: '버전 스템 스트리밍 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'VersionStem을 찾을 수 없음' })
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
  @ApiOperation({ summary: '트랙 스템들 스트리밍 URL 조회', description: '트랙의 모든 stems 스트리밍 URL을 조회합니다.' })
  @ApiParam({ name: 'trackId', description: '트랙 ID' })
  @ApiResponse({ status: 200, description: '트랙 스템들 스트리밍 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
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
  @ApiOperation({ summary: '배치 스트리밍 URL 생성', description: '여러 Stem ID로 배치 스트리밍 URL을 생성합니다.' })
  @ApiBody({ type: BatchStreamRequestDto })
  @ApiResponse({ status: 200, description: '배치 스트리밍 URL 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
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
  @ApiOperation({ summary: '마스터 스템들 스트리밍 URL 조회', description: '특정 버전의 마스터 stems 스트리밍 URL을 조회합니다.' })
  @ApiParam({ name: 'trackId', description: '트랙 ID' })
  @ApiParam({ name: 'version', description: '버전 번호' })
  @ApiResponse({ status: 200, description: '마스터 스템들 스트리밍 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '트랙 또는 버전을 찾을 수 없음' })
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
  @ApiOperation({ summary: '업스트림 스템들 스트리밍 URL 조회', description: 'Upstream의 모든 stems 스트리밍 URL을 조회합니다.' })
  @ApiParam({ name: 'upstreamId', description: 'Upstream ID' })
  @ApiResponse({ status: 200, description: '업스트림 스템들 스트리밍 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'Upstream을 찾을 수 없음' })
  async getUpstreamStemsStreamingUrls(
    @Param('upstreamId') upstreamId: string,
    @Request() req: any
  ) {
    return this.streamingService.getUpstreamStemsStreamingUrls(upstreamId, req.user.id);
  }
}
