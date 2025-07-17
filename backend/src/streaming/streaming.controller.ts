import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { StreamingService } from './streaming.service';
import { BatchStreamRequestDto, TrackStemsQueryDto, StemInfoDto, BatchStemInfoRequestDto, StemPeaksPresignedUrlDto, GuideWaveformPresignedUrlDto } from './dto/streaming.dto';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guide Path 스트리밍을 위한 DTO import 추가
 */
import { GuidePathStreamingDto, BatchGuidePathStreamingDto } from './dto/streaming.dto';

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

  // ===========================================
  // Guide Path 기반 스트리밍 엔드포인트들
  // ===========================================

  /**
   * Guide Path로 presigned URL 생성
   * 
   * POST /streaming/guide/presigned
   * 
   * 프론트엔드에서 이미 가지고 있는 guide path 정보를 제공받아
   * 권한만 확인하고 presigned URL만 반환
   */
  @Post('guide/presigned')
  @ApiOperation({ summary: 'Guide Path 스트리밍 URL 생성', description: '프론트엔드에서 제공받은 guide path 정보로 presigned streaming URL을 생성합니다.' })
  @ApiBody({ type: GuidePathStreamingDto })
  @ApiResponse({ status: 200, description: 'Guide Path 스트리밍 URL 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'Guide 파일을 찾을 수 없음' })
  async getGuidePathPresignedUrl(
    @Body() guidePathInfo: GuidePathStreamingDto,
    @Request() req: any
  ) {
    return this.streamingService.getGuidePathPresignedUrl(guidePathInfo, req.user.id);
  }

  /**
   * 배치 Guide Path presigned URL 생성
   * 
   * POST /streaming/guides/batch-presigned
   * 
   * 프론트엔드에서 이미 가지고 있는 guide paths 정보를 제공받아
   * 권한만 확인하고 presigned URLs를 반환
   */
  @Post('guides/batch-presigned')
  @ApiOperation({ summary: '배치 Guide Path 스트리밍 URL 생성', description: '여러 guide path 정보로 배치 presigned streaming URL을 생성합니다.' })
  @ApiBody({ type: BatchGuidePathStreamingDto })
  @ApiResponse({ status: 200, description: '배치 Guide Path 스트리밍 URL 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'Guide 파일들을 찾을 수 없음' })
  async getBatchGuidePathPresignedUrls(
    @Body() request: BatchGuidePathStreamingDto,
    @Request() req: any
  ) {
    return this.streamingService.getBatchGuidePathPresignedUrls(request.guidePaths, req.user.id);
  }

  /**
   * Stage ID로 guide 스트리밍 URL 조회
   * 
   * GET /streaming/stage/:stageId/guide
   * 
   * Stage ID를 받아서 DB에서 guide path를 조회하고 스트리밍 URL 반환
   * Stage.guide_path 또는 Guide 엔티티의 mixed_file_path 사용
   */
  @Get('stage/:stageId/guide')
  @ApiOperation({ summary: 'Stage Guide 스트리밍 URL 조회', description: 'Stage ID로 guide 스트리밍 URL을 조회합니다.' })
  @ApiParam({ name: 'stageId', description: 'Stage ID' })
  @ApiResponse({ status: 200, description: 'Stage Guide 스트리밍 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'Stage 또는 Guide를 찾을 수 없음' })
  async getStageGuideStreamingUrl(
    @Param('stageId') stageId: string,
    @Request() req: any
  ) {
    return this.streamingService.getStageGuideStreamingUrl(stageId, req.user.id);
  }

  /**
   * Upstream ID로 guide 스트리밍 URL 조회
   * 
   * GET /streaming/upstream/:upstreamId/guide
   * 
   * Upstream ID를 받아서 DB에서 guide path를 조회하고 스트리밍 URL 반환
   */
  @Get('upstream/:upstreamId/guide')
  @ApiOperation({ summary: 'Upstream Guide 스트리밍 URL 조회', description: 'Upstream ID로 guide 스트리밍 URL을 조회합니다.' })
  @ApiParam({ name: 'upstreamId', description: 'Upstream ID' })
  @ApiResponse({ status: 200, description: 'Upstream Guide 스트리밍 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'Upstream 또는 Guide를 찾을 수 없음' })
  async getUpstreamGuideStreamingUrl(
    @Param('upstreamId') upstreamId: string,
    @Request() req: any
  ) {
    return this.streamingService.getUpstreamGuideStreamingUrl(upstreamId, req.user.id);
  }

  @Post('/streaming/guide-waveform-presigned-url')
  @ApiOperation({ summary: 'Guide Waveform 스트리밍 presignedUrl 생성', description: 'UpstreamId로 가이드 파형 데이터 스트리밍 URL을 생성합니다.' })
  @ApiBody({ type: GuideWaveformPresignedUrlDto })
  @ApiResponse({ status: 200, description: '가이드 파형 PreSigned URL 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '가이드 파일을 찾을 수 없음' })
  async getGuideWaveformPresignedUrl(
    @Body() dto: GuideWaveformPresignedUrlDto,
    @Request() req: any
  ) {
    return this.streamingService.getUpstreamGuideWaveformUrl(dto.upstreamId, req.user.id);
  }

}
