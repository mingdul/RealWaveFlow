import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { DownloadService } from './download.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { 
  BatchDownloadRequestDto, 
  TrackStemsDownloadQueryDto, 
  StemDownloadInfoDto, 
  BatchStemDownloadRequestDto 
} from './dto/download.dto';

/**
 * Download Controller
 * 
 * 음악 스템 파일들의 다운로드 URL을 제공하는 컨트롤러
 * - 작업 중인 stems (Stem 엔티티)와 완성된 버전 stems (VersionStem 엔티티) 모두 지원
 * - JWT 인증을 통한 사용자 권한 검증
 * - 트랙 소유자 또는 협업자만 접근 가능
 */
@ApiTags('download')
@ApiBearerAuth()
@Controller('download')
@UseGuards(JwtAuthGuard)
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  /**
   * 프론트엔드에서 제공받은 stem 정보로 presigned download URL 생성
   * 
   * POST /download/stem/presigned
   * 
   * 프론트엔드에서 이미 가지고 있는 stem 정보를 제공받아
   * 권한만 확인하고 presigned download URL만 반환
   */
  @Post('stem/presigned')
  @ApiOperation({ summary: '스템 다운로드 URL 생성', description: '프론트엔드에서 제공받은 stem 정보로 presigned download URL을 생성합니다.' })
  @ApiBody({ type: StemDownloadInfoDto })
  @ApiResponse({ status: 200, description: '다운로드 URL 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async getStemDownloadUrl(
    @Body() stemInfo: StemDownloadInfoDto,
    @Request() req: any
  ) {
    return this.downloadService.getStemDownloadUrl(stemInfo, req.user.id);
  }

  /**
   * 프론트엔드에서 제공받은 stems 정보로 배치 presigned download URL 생성
   * 
   * POST /download/stems/batch-presigned
   * 
   * 프론트엔드에서 이미 가지고 있는 stems 정보를 제공받아
   * 권한만 확인하고 presigned download URL만 반환
   */
  @Post('stems/batch-presigned')
  @ApiOperation({ summary: '배치 스템 다운로드 URL 생성', description: '여러 stem 정보로 배치 presigned download URL을 생성합니다.' })
  @ApiBody({ type: BatchStemDownloadRequestDto })
  @ApiResponse({ status: 200, description: '배치 다운로드 URL 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async getBatchStemDownloadUrls(
    @Body() request: BatchStemDownloadRequestDto,
    @Request() req: any
  ) {
    return this.downloadService.getBatchStemDownloadUrls(request.stems, req.user.id);
  }

  /**
   * 개별 Stem 다운로드 URL 조회 (작업 중인 stems)
   * 
   * GET /download/stem/:stemId
   * 
   * Stem ID를 받아서 DB에서 정보를 조회하고 다운로드 URL 반환
   */
  @Get('stem/:stemId')
  @ApiOperation({ summary: '스템 다운로드 URL 조회', description: 'Stem ID로 다운로드 URL을 조회합니다.' })
  @ApiParam({ name: 'stemId', description: 'Stem ID' })
  @ApiResponse({ status: 200, description: '다운로드 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'Stem을 찾을 수 없음' })
  async getStemDownloadUrlById(
    @Param('stemId') stemId: string,
    @Request() req: any
  ) {
    return this.downloadService.getStemDownloadUrlById(stemId, req.user.id);
  }

  /**
   * 개별 VersionStem 다운로드 URL 조회 (완성된 버전 stems)
   * 
   * GET /download/version-stem/:stemId
   * 
   * VersionStem ID를 받아서 DB에서 정보를 조회하고 다운로드 URL 반환
   */
  @Get('version-stem/:stemId')
  @ApiOperation({ summary: '버전 스템 다운로드 URL 조회', description: 'VersionStem ID로 다운로드 URL을 조회합니다.' })
  @ApiParam({ name: 'stemId', description: 'VersionStem ID' })
  @ApiResponse({ status: 200, description: '다운로드 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'VersionStem을 찾을 수 없음' })
  async getVersionStemDownloadUrl(
    @Param('stemId') stemId: string,
    @Request() req: any
  ) {
    return this.downloadService.getVersionStemDownloadUrl(stemId, req.user.id);
  }

  /**
   * 트랙의 모든 작업 중인 stems 다운로드 URL 조회 (Upstream을 통해)
   * 
   * GET /download/track/:trackId/stems
   * 
   * 트랙 ID를 받아서 해당 트랙의 모든 stems를 DB에서 조회하고 다운로드 URL 반환
   * 트랙 정보와 함께 제공
   */
  @Get('track/:trackId/stems')
  @ApiOperation({ summary: '트랙 스템들 다운로드 URL 조회', description: '트랙의 모든 stems 다운로드 URL을 조회합니다.' })
  @ApiParam({ name: 'trackId', description: '트랙 ID' })
  @ApiResponse({ status: 200, description: '트랙 스템들 다운로드 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
  async getTrackStemsDownloadUrls(
    @Param('trackId') trackId: string,
    @Query() query: TrackStemsDownloadQueryDto,
    @Request() req: any
  ) {
    return this.downloadService.getTrackStemsDownloadUrls(
      trackId, 
      req.user.id, 
      query.version
    );
  }

  /**
   * 배치 다운로드 - Stem과 VersionStem 모두 지원
   * 
   * POST /download/batch
   * 
   * Stem ID 배열을 받아서 DB에서 정보를 조회하고 다운로드 URL 반환
   * Stem과 VersionStem ID가 혼재되어도 처리 가능
   */
  @Post('batch')
  @ApiOperation({ summary: '배치 다운로드 URL 생성', description: '여러 Stem ID로 배치 다운로드 URL을 생성합니다.' })
  @ApiBody({ type: BatchDownloadRequestDto })
  @ApiResponse({ status: 200, description: '배치 다운로드 URL 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async getBatchDownloadUrls(
    @Body() request: BatchDownloadRequestDto,
    @Request() req: any
  ) {
    return this.downloadService.getBatchDownloadUrls(request.stemIds, req.user.id);
  }

  /**
   * 특정 버전의 마스터 stems 다운로드 URL 조회 (VersionStem)
   * 
   * GET /download/track/:trackId/version/:version/master-stems
   * 
   * 트랙 ID와 버전을 받아서 해당 버전의 모든 VersionStems를 DB에서 조회하고 다운로드 URL 반환
   * 트랙 정보와 함께 제공
   */
  @Get('track/:trackId/version/:version/master-stems')
  @ApiOperation({ summary: '마스터 스템들 다운로드 URL 조회', description: '특정 버전의 마스터 stems 다운로드 URL을 조회합니다.' })
  @ApiParam({ name: 'trackId', description: '트랙 ID' })
  @ApiParam({ name: 'version', description: '버전 번호' })
  @ApiResponse({ status: 200, description: '마스터 스템들 다운로드 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '트랙 또는 버전을 찾을 수 없음' })
  async getMasterStemDownloadUrls(
    @Param('trackId') trackId: string,
    @Param('version') version: string,
    @Request() req: any
  ) {
    return this.downloadService.getMasterStemDownloadUrls(
      trackId, 
      parseInt(version), 
      req.user.id
    );
  }

  /**
   * Upstream의 stems 다운로드 URL 조회
   * 
   * GET /download/upstream/:upstreamId/stems
   * 
   * Upstream ID를 받아서 해당 upstream의 모든 stems를 DB에서 조회하고 다운로드 URL 반환
   */
  @Get('upstream/:upstreamId/stems')
  @ApiOperation({ summary: '업스트림 스템들 다운로드 URL 조회', description: 'Upstream의 모든 stems 다운로드 URL을 조회합니다.' })
  @ApiParam({ name: 'upstreamId', description: 'Upstream ID' })
  @ApiResponse({ status: 200, description: '업스트림 스템들 다운로드 URL 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'Upstream을 찾을 수 없음' })
  async getUpstreamStemsDownloadUrls(
    @Param('upstreamId') upstreamId: string,
    @Request() req: any
  ) {
    return this.downloadService.getUpstreamStemsDownloadUrls(upstreamId, req.user.id);
  }
} 