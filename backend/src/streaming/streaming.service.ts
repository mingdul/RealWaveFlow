import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Stem } from '../stem/stem.entity';
import { Track } from '../track/track.entity';
import { Stage } from '../stage/stage.entity';
import { VersionStem } from '../version-stem/version-stem.entity';
import { Upstream } from '../upstream/upstream.entity';
import { Guide } from '../guide/guide.entity';
import { S3Service } from './s3.service';
import { StemStreamingInfo, AudioMetadata, StemInfoDto, SimpleStemStreamingInfo } from './dto/streaming.dto';
import { VersionStemService } from 'src/version-stem/version-stem.service';

/**
 * Guide Path 기반 스트리밍을 위한 추가 import
 */
import { GuidePathStreamingDto, GuidePathStreamingResponse } from './dto/streaming.dto';

/**
 * Streaming Service
 * 
 * 음악 스템 파일들의 스트리밍 URL을 제공하는 서비스
 * - 작업 중인 stems (Stem 엔티티)와 완성된 버전 stems (VersionStem 엔티티) 모두 지원
 * - 트랙 소유자 또는 협업자만 접근 가능하도록 권한 검증
 * - S3 presigned URL을 통해 안전한 파일 접근 제공
 */
@Injectable()
export class StreamingService {
  constructor(
    @InjectRepository(Stem)
    private stemRepository: Repository<Stem>,
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
    @InjectRepository(Stage)
    private stageRepository: Repository<Stage>,
    @InjectRepository(VersionStem)
    private versionStemRepository: Repository<VersionStem>,
    @InjectRepository(Upstream)
    private upstreamRepository: Repository<Upstream>,
    @InjectRepository(Guide)
    private guideRepository: Repository<Guide>,
    private versionStemService: VersionStemService,
    private s3Service: S3Service,

  ) {}

  /**
   * 프론트엔드에서 제공받은 stem 정보로 presigned URL 생성
   * 
   * @param stemInfo - 프론트엔드에서 제공한 stem 정보
   * @param userId - 요청한 사용자 ID
   * @returns presigned URL과 만료 시간
   * 
   * 권한 검증: trackId를 통해 트랙 접근 권한만 확인
   */
  async getStemPresignedUrl(stemInfo: StemInfoDto, userId: string): Promise<SimpleStemStreamingInfo> {
    // 권한 검증 - trackId를 통해 트랙 접근 권한 확인
    await this.validateTrackAccess(stemInfo.trackId, userId);

    // S3 presigned URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedUrl(stemInfo.filePath);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      stemId: stemInfo.stemId,
      presignedUrl,
      urlExpiresAt: expiresAt,
    };
  }

  /**
   * 프론트엔드에서 제공받은 stems 정보로 배치 presigned URL 생성
   * 
   * @param stems - 프론트엔드에서 제공한 stems 정보 배열
   * @param userId - 요청한 사용자 ID
   * @returns 모든 stems의 presigned URL과 만료 시간
   * 
   * 권한 검증: 각 stem의 trackId를 통해 트랙 접근 권한 확인
   */
  async getBatchStemPresignedUrls(stems: StemInfoDto[], userId: string): Promise<{
    stems: SimpleStemStreamingInfo[];
    urlExpiresAt: string;
  }> {
    if (stems.length === 0) {
      throw new NotFoundException('No stems provided');
    }

    // 권한 검증 - 모든 관련 트랙에 대한 접근 권한 확인
    const trackIds = [...new Set(stems.map(stem => stem.trackId))];
    for (const trackId of trackIds) {
      await this.validateTrackAccess(trackId, userId);
    }

    // presigned URL 생성
    const presignedUrls = await this.s3Service.getBatchPresignedUrls(
      stems.map(stem => stem.filePath)
    );

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // 결과 구성
    const streamingStems: SimpleStemStreamingInfo[] = stems.map(stem => ({
      stemId: stem.stemId,
      presignedUrl: presignedUrls[stem.filePath],
      urlExpiresAt: expiresAt,
    }));

    return {
      stems: streamingStems,
      urlExpiresAt: expiresAt,
    };
  }

  /**
   * 개별 Stem 스트리밍 URL 조회 (작업 중인 stems)
   * 
   * @param stemId - 스템 ID
   * @param userId - 요청한 사용자 ID
   * @returns 스트리밍 URL과 메타데이터
   * 
   * 권한 검증: Stem → Upstream → Stage → Track 경로로 트랙 접근 권한 확인
   */
  async getStemStreamingUrl(stemId: string, userId: string): Promise<{
    stemId: string;
    fileName: string;
    presignedUrl: string;
    metadata: AudioMetadata;
    urlExpiresAt: string;
  }> {
    // Stem과 관련 엔티티들을 함께 조회
    const stem = await this.stemRepository.findOne({
      where: { id: stemId },
      relations: ['category', 'upstream', 'upstream.stage', 'upstream.stage.track'],
    });

    if (!stem) {
      throw new NotFoundException('Stem file not found');
    }

    // 권한 검증 - 업스트림을 통해 트랙에 접근 권한 확인
    if (!stem.upstream?.stage?.track?.id) {
      throw new NotFoundException('Track information not found for this stem');
    }
    await this.validateTrackAccess(stem.upstream.stage.track.id, userId);

    // S3 presigned URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedUrl(stem.file_path);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      stemId: stem.id,
      fileName: stem.file_name,
      presignedUrl,
      metadata: this.extractStemMetadata(stem),
      urlExpiresAt: expiresAt,
    };
  }

  /**
   * 개별 VersionStem 스트리밍 URL 조회 (완성된 버전 stems)
   * 
   * @param stemId - 버전 스템 ID
   * @param userId - 요청한 사용자 ID
   * @returns 스트리밍 URL과 메타데이터
   * 
   * 권한 검증: VersionStem → Stage → Track 경로로 트랙 접근 권한 확인
   */
  async getVersionStemStreamingUrl(stemId: string, userId: string): Promise<{
    stemId: string;
    fileName: string;
    presignedUrl: string;
    metadata: AudioMetadata;
    urlExpiresAt: string;
  }> {
    // VersionStem과 관련 엔티티들을 함께 조회
    const versionStem = await this.versionStemRepository.findOne({
      where: { id: stemId },
      relations: ['category', 'stage', 'stage.track'],
    });

    if (!versionStem) {
      throw new NotFoundException('Version stem file not found');
    }

    // 권한 검증 - stage를 통해 트랙에 접근 권한 확인
    if (!versionStem.stage?.track?.id) {
      throw new NotFoundException('Track information not found for this version stem');
    }
    await this.validateTrackAccess(versionStem.stage.track.id, userId);

    // S3 presigned URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedUrl(versionStem.file_path);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      stemId: versionStem.id,
      fileName: versionStem.file_name,
      presignedUrl,
      metadata: this.extractVersionStemMetadata(versionStem),
      urlExpiresAt: expiresAt,
    };
  }

  /**
   * 트랙의 모든 작업 중인 stems 조회 (Upstream을 통해)
   * 
   * @param trackId - 트랙 ID
   * @param userId - 요청한 사용자 ID
   * @param version - 버전 필터 (선택사항, 현재 미사용)
   * @returns 트랙 정보와 모든 stems의 스트리밍 URL
   * 
   * 조회 경로: Track → Stages → Upstreams → Stems
   */
  async getTrackStemsStreamingUrls(
    trackId: string, 
    userId: string, 
    version?: string
  ): Promise<{
    trackId: string;
    trackInfo: any;
    stems: StemStreamingInfo[];
    totalStems: number;
    urlExpiresAt: string;
  }> {
    // 트랙 존재 및 권한 확인
    const track = await this.validateTrackAccess(trackId, userId);

    // 해당 트랙의 모든 stage를 통해 upstream의 stems 조회
    const stages = await this.stageRepository.find({
      where: { track: { id: trackId } },
      relations: ['upstreams', 'upstreams.stems', 'upstreams.stems.category', 'upstreams.user'],
    });

    // 모든 stems를 하나의 배열로 수집
    const allStems: Stem[] = [];
    stages.forEach(stage => {
      stage.upstreams?.forEach(upstream => {
        if (upstream.stems) {
          allStems.push(...upstream.stems);
        }
      });
    });

    if (allStems.length === 0) {
      return {
        trackId,
        trackInfo: {
          title: track.title,
          description: track.description,
          genre: track.genre,
          bpm: track.bpm,
          key_signature: track.key_signature,
        },
        stems: [],
        totalStems: 0,
        urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
    }

    // 모든 스템 파일의 presigned URL 생성
    const stemKeys = allStems.map(stem => stem.file_path);
    const presignedUrls = await this.s3Service.getBatchPresignedUrls(stemKeys);

    // 스트리밍 정보 구성
    const streamingStems: StemStreamingInfo[] = allStems.map(stem => ({
      id: stem.id,
      fileName: stem.file_name,
      category: stem.category?.name || null,
      tag: null, // Stem 엔티티에는 tag 필드가 없음
      key: stem.key,
      description: null, // Stem 엔티티에는 description 필드가 없음
      presignedUrl: presignedUrls[stem.file_path],
      metadata: this.extractStemMetadata(stem),
      uploadedBy: {
        id: stem.upstream?.user?.id || 'unknown',
        username: stem.upstream?.user?.username || 'unknown',
      },
      uploadedAt: stem.uploaded_at.toISOString(),
    }));

    return {
      trackId,
      trackInfo: {
        title: track.title,
        description: track.description,
        genre: track.genre,
        bpm: track.bpm,
        key_signature: track.key_signature,
      },
      stems: streamingStems,
      totalStems: allStems.length,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  /**
   * 배치 스트리밍 - Stem과 VersionStem 모두 지원
   * 
   * @param stemIds - 스템 ID 배열 (Stem과 VersionStem ID 혼재 가능)
   * @param userId - 요청한 사용자 ID
   * @returns 모든 stems의 스트리밍 URL
   * 
   * 권한 검증: 각 stem의 트랙에 대한 접근 권한을 개별적으로 확인
   */
  async getBatchStreamingUrls(stemIds: string[], userId: string): Promise<{
    streams: Array<{
      stemId: string;
      fileName: string;
      presignedUrl: string;
      metadata: AudioMetadata;
    }>;
    urlExpiresAt: string;
  }> {
    // Stem과 VersionStem을 모두 조회
    const stems = await this.stemRepository.find({
      where: { id: In(stemIds) },
      relations: ['upstream', 'upstream.stage', 'upstream.stage.track'],
    });

    const versionStems = await this.versionStemRepository.find({
      where: { id: In(stemIds) },
      relations: ['stage', 'stage.track'],
    });

    if (stems.length === 0 && versionStems.length === 0) {
      throw new NotFoundException('No stem files found');
    }

    // 권한 검증 - 모든 관련 트랙에 대한 접근 권한 확인
    const trackIds = new Set<string>();
    
    stems.forEach(stem => {
      if (stem.upstream?.stage?.track?.id) {
        trackIds.add(stem.upstream.stage.track.id);
      }
    });
    
    versionStems.forEach(versionStem => {
      if (versionStem.stage?.track?.id) {
        trackIds.add(versionStem.stage.track.id);
      }
    });

    for (const trackId of trackIds) {
      await this.validateTrackAccess(trackId, userId);
    }

    // presigned URL 생성
    const allStemKeys = [
      ...stems.map(stem => stem.file_path),
      ...versionStems.map(versionStem => versionStem.file_path)
    ];
    const presignedUrls = await this.s3Service.getBatchPresignedUrls(allStemKeys);

    // 결과 구성
    const streams = [
      ...stems.map(stem => ({
        stemId: stem.id,
        fileName: stem.file_name,
        presignedUrl: presignedUrls[stem.file_path],
        metadata: this.extractStemMetadata(stem),
      })),
      ...versionStems.map(versionStem => ({
        stemId: versionStem.id,
        fileName: versionStem.file_name,
        presignedUrl: presignedUrls[versionStem.file_path],
        metadata: this.extractVersionStemMetadata(versionStem),
      }))
    ];

    return {
      streams,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  /**
   * 특정 버전의 마스터 stems 조회 (VersionStem)
   * 
   * @param trackId - 트랙 ID
   * @param version - 버전 번호
   * @param userId - 요청한 사용자 ID
   * @returns 특정 버전의 모든 stems 스트리밍 URL
   * 
   * 조회 경로: Track → Stage (특정 버전) → VersionStems
   */
  async getMasterStemStreamingUrls(
    trackId: string,
    version: number,
    userId: string,
  ) {
    // 트랙 존재 및 권한 확인
    const track = await this.validateTrackAccess(trackId, userId);

    // 특정 버전의 Stage 조회
    const stage = await this.stageRepository.findOne({
      where: { 
        track: { id: trackId },
        version: version
      },
      relations: ['version_stems', 'version_stems.category', 'user'],
    });

    if (!stage) {
      return {
        success: false,
        message: 'No stage found',
        data: {
        trackId,
        version,
        trackInfo: {
          title: track.title,
          description: track.description,
          genre: track.genre,
          bpm: track.bpm,
          key_signature: track.key_signature,
        },
        stems: [],
        totalStems: 0,
        urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      };
    }


    const result = await this.versionStemService.getLatestStemsPerCategoryByTrack(trackId, version);
    const versionStems = result.data.map(item => item.stem);
    // 모든 VersionStem 파일의 presigned URL 생성
    const stemKeys = versionStems.map(stem => stem.file_path);
    const presignedUrls = await this.s3Service.getBatchPresignedUrls(stemKeys);

    // 스트리밍 정보 구성
    const streamingStems: StemStreamingInfo[] = versionStems.map(stem => ({
      id: stem.id,
      fileName: stem.file_name,
      category: stem.category?.name || null,
      tag: null, // VersionStem에는 tag 필드가 없음
      key: stem.key,
      description: null, // VersionStem에는 description 필드가 없음
      presignedUrl: presignedUrls[stem.file_path],
      metadata: this.extractVersionStemMetadata(stem),
      uploadedBy: {
        id: stage.user?.id || 'unknown',
        username: stage.user?.username || 'unknown',
      },
      uploadedAt: stem.uploaded_at.toISOString(),
    }));

    return {
      success: true,
      message: 'Successfully fetched master stem streaming URLs',
      data: {
      trackId,
      version,
      trackInfo: {
        title: track.title,
        description: track.description,
        genre: track.genre,
        bpm: track.bpm,
        key_signature: track.key_signature,
      },
      stems: streamingStems,
      totalStems: versionStems.length,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    };
  }

  /**
   * Upstream의 stems 조회
   * 
   * @param upstreamId - Upstream ID
   * @param userId - 요청한 사용자 ID
   * @returns 해당 upstream의 모든 stems 스트리밍 URL
   * 
   * 권한 검증: Upstream → Stage → Track 경로로 트랙 접근 권한 확인
   */
  async getUpstreamStemsStreamingUrls(
    upstreamId: string,
    userId: string,
  ): Promise<{
    upstreamId: string;
    stems: StemStreamingInfo[];
    totalStems: number;
    urlExpiresAt: string;
  }> {
    // 특정 upstream의 모든 stems 조회
    const stems = await this.stemRepository.find({
      where: { upstream: { id: upstreamId } },
      relations: ['upstream', 'upstream.stage', 'upstream.stage.track', 'category', 'upstream.user'],
    });

    if (stems.length === 0) {
      return {
        upstreamId,
        stems: [],
        totalStems: 0,
        urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
    }

    // 권한 검증 - 첫 번째 stem의 트랙에 대한 접근 권한 확인
    const firstStem = stems[0];
    if (!firstStem.upstream?.stage?.track?.id) {
      throw new NotFoundException('Track information not found for this upstream');
    }
    await this.validateTrackAccess(firstStem.upstream.stage.track.id, userId);

    // presigned URL 생성
    const stemKeys = stems.map(stem => stem.file_path);
    const presignedUrls = await this.s3Service.getBatchPresignedUrls(stemKeys);

    // 스트리밍 정보 구성
    const streamingStems: StemStreamingInfo[] = stems.map(stem => ({
      id: stem.id,
      fileName: stem.file_name,
      category: stem.category?.name || null,
      tag: null,
      key: stem.key,
      description: null,
      presignedUrl: presignedUrls[stem.file_path],
      metadata: this.extractStemMetadata(stem),
      uploadedBy: {
        id: stem.upstream?.user?.id || 'unknown',
        username: stem.upstream?.user?.username || 'unknown',
      },
      uploadedAt: stem.uploaded_at.toISOString(),
    }));

    return {
      upstreamId,
      stems: streamingStems,
      totalStems: stems.length,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  /**
   * 트랙 접근 권한 검증
   * 
   * @param trackId - 트랙 ID
   * @param userId - 사용자 ID
   * @returns 트랙 엔티티
   * @throws ForbiddenException - 접근 권한이 없는 경우
   * @throws NotFoundException - 트랙을 찾을 수 없는 경우
   */
  private async validateTrackAccess(trackId: string, userId: string): Promise<Track> {
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
      relations: ['owner_id', 'collaborators', 'collaborators.user_id'],
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    // 트랙 소유자인지 확인
    if (track.owner_id.id === userId) {
      return track;
    }

    // 협업자인지 확인
    const isCollaborator = track.collaborators?.some(
      collaborator => collaborator.user_id.id === userId
    );

    if (!isCollaborator) {
      throw new ForbiddenException('Access denied to this track');
    }

    return track;
  }

  /**
   * Stem 엔티티에서 오디오 메타데이터 추출
   */
  private extractStemMetadata(stem: Stem): AudioMetadata {
    return {
      duration: null,
      fileSize: null,
      sampleRate: null,
      channels: null,
      format: this.getFileFormat(stem.file_name),
    };
  }

  /**
   * VersionStem 엔티티에서 오디오 메타데이터 추출
   */
  private extractVersionStemMetadata(stem: VersionStem): AudioMetadata {
    return {
      duration: null,
      fileSize: null,
      sampleRate: null,
      channels: null,
      format: this.getFileFormat(stem.file_name),
    };
  }

  /**
   * 파일명에서 확장자를 추출하여 포맷 정보 반환
   */
  private getFileFormat(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  /**
   * Guide Path로 presigned URL 생성
   * 
   * @param guidePathInfo - 프론트엔드에서 제공한 guide path 정보
   * @param userId - 요청한 사용자 ID
   * @returns presigned URL과 메타데이터
   * 
   * 권한 검증: trackId를 통해 트랙 접근 권한 확인
   */
  async getGuidePathPresignedUrl(
    guidePathInfo: GuidePathStreamingDto, 
    userId: string
  ): Promise<GuidePathStreamingResponse> {
    // 권한 검증 - trackId를 통해 트랙 접근 권한 확인
    await this.validateTrackAccess(guidePathInfo.trackId, userId);

    // S3 presigned URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedUrl(guidePathInfo.guidePath);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // 파일명 추출 (경로에서 마지막 부분)
    const fileName = guidePathInfo.guidePath.split('/').pop() || 'guide.wav';

    return {
      guidePath: guidePathInfo.guidePath,
      presignedUrl,
      urlExpiresAt: expiresAt,
      fileName,
    };
  }

  async getStemPeaksPresignedUrl(
    trackId: string,
    stemId: string, 
    userId: string
  ): Promise<GuidePathStreamingResponse> {
    // 권한 검증 - trackId를 통해 트랙 접근 권한 확인
    await this.validateTrackAccess(trackId, userId);

    const stem = await this.stemRepository.findOne({
      where: { id: stemId }
    });

    if (!stem) {
      throw new NotFoundException(`Stem not found: ${stemId}`);
    }

    if (!stem.audio_wave_path) {
      throw new NotFoundException('No waveform data found for this stem');
    }

    // S3 presigned URL 생성 (1시간 유효) - audio_wave_path는 waveform JSON 파일
    const presignedUrl = await this.s3Service.getPresignedUrl(stem.audio_wave_path);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    const fileName = stem.audio_wave_path.split('/').pop() || 'waveform.json';

    return {
      guidePath: stem.audio_wave_path,
      presignedUrl,
      urlExpiresAt: expiresAt,
      fileName,
    };
  }

  /**
   * 배치 Guide Path presigned URL 생성
   * 
   * @param guidePaths - 프론트엔드에서 제공한 guide paths 정보 배열
   * @param userId - 요청한 사용자 ID
   * @returns 모든 guide paths의 presigned URL과 메타데이터
   * 
   * 권한 검증: 각 guide path의 trackId를 통해 트랙 접근 권한 확인
   */
  async getBatchGuidePathPresignedUrls(
    guidePaths: GuidePathStreamingDto[], 
    userId: string
  ): Promise<{
    guidePaths: GuidePathStreamingResponse[];
    urlExpiresAt: string;
  }> {
    if (guidePaths.length === 0) {
      throw new NotFoundException('No guide paths provided');
    }

    // 권한 검증 - 모든 관련 트랙에 대한 접근 권한 확인
    const trackIds = [...new Set(guidePaths.map(guide => guide.trackId))];
    for (const trackId of trackIds) {
      await this.validateTrackAccess(trackId, userId);
    }

    // presigned URL 생성
    const paths = guidePaths.map(guide => guide.guidePath);
    const presignedUrls = await this.s3Service.getBatchPresignedUrls(paths);

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // 결과 구성
    const streamingGuidePaths: GuidePathStreamingResponse[] = guidePaths.map(guide => ({
      guidePath: guide.guidePath,
      presignedUrl: presignedUrls[guide.guidePath],
      urlExpiresAt: expiresAt,
      fileName: guide.guidePath.split('/').pop() || 'guide.wav',
    }));

    return {
      guidePaths: streamingGuidePaths,
      urlExpiresAt: expiresAt,
    };
  }

  /**
   * Stage ID로 guide path 조회 후 스트리밍 URL 생성
   * 
   * @param stageId - Stage ID
   * @param userId - 요청한 사용자 ID
   * @returns guide path의 presigned URL과 메타데이터
   * 
   * 조회 순서: Stage.guide_path → Guide 엔티티 mixed_file_path
   * 권한 검증: Stage → Track 경로로 트랙 접근 권한 확인
   */
  async getStageGuideStreamingUrl(
    stageId: string, 
    userId: string
  ): Promise<GuidePathStreamingResponse> {
    // Stage와 관련 엔티티들을 함께 조회
    const stage = await this.stageRepository.findOne({
      where: { id: stageId },
      relations: ['track', 'guide'],
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    // 권한 검증 - stage를 통해 트랙에 접근 권한 확인
    if (!stage.track?.id) {
      throw new NotFoundException('Track information not found for this stage');
    }
    await this.validateTrackAccess(stage.track.id, userId);

    // guide path 결정 (우선순위: stage.guide_path → guide.mixed_file_path)
    let guidePath: string | null = null;
    let fileName = 'guide.wav';

    if (stage.guide_path) {
      guidePath = stage.guide_path;
      fileName = stage.guide_path.split('/').pop() || 'guide.wav';
    } else if (stage.guide?.mixed_file_path) {
      guidePath = stage.guide.mixed_file_path;
      fileName = stage.guide.mixed_file_path.split('/').pop() || 'guide.wav';
    }

    if (!guidePath) {
      throw new NotFoundException('No guide file found for this stage');
    }

    // S3 presigned URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedUrl(guidePath);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      guidePath,
      presignedUrl,
      urlExpiresAt: expiresAt,
      fileName,
    };
  }

  /**
   * Upstream ID로 guide path 조회 후 스트리밍 URL 생성
   * 
   * @param upstreamId - Upstream ID
   * @param userId - 요청한 사용자 ID
   * @returns guide path의 presigned URL과 메타데이터
   * 
   * 권한 검증: Upstream → Stage → Track 경로로 트랙 접근 권한 확인
   */
  async getUpstreamGuideStreamingUrl(
    upstreamId: string, 
    userId: string
  ): Promise<GuidePathStreamingResponse> {
    // Upstream과 관련 엔티티들을 함께 조회
    const upstream = await this.upstreamRepository.findOne({
      where: { id: upstreamId },
      relations: ['stage', 'stage.track'],
    });

    if (!upstream) {
      throw new NotFoundException('Upstream not found');
    }

    // 권한 검증 - upstream을 통해 트랙에 접근 권한 확인
    if (!upstream.stage?.track?.id) {
      throw new NotFoundException('Track information not found for this upstream');
    }
    await this.validateTrackAccess(upstream.stage.track.id, userId);

    if (!upstream.guide_path) {
      throw new NotFoundException('No guide file found for this upstream');
    }

    // S3 presigned URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedUrl(upstream.guide_path);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    const fileName = upstream.guide_path.split('/').pop() || 'guide.wav';

    return {
      guidePath: upstream.guide_path,
      presignedUrl,
      urlExpiresAt: expiresAt,
      fileName,
    };
  }

  /**
   * Upstream의 Guide Waveform 데이터 URL 조회
   * 
   * @param upstreamId - 업스트림 ID
   * @param userId - 요청한 사용자 ID
   * @returns waveform JSON 데이터의 presigned URL
   * 
   * 권한 검증: Upstream → Stage → Track 경로로 트랙 접근 권한 확인
   */
  async getUpstreamGuideWaveformUrl(
    upstreamId: string, 
    userId: string
  ): Promise<GuidePathStreamingResponse> {
    // Upstream과 관련 엔티티들을 함께 조회
    const upstream = await this.upstreamRepository.findOne({
      where: { id: upstreamId },
      relations: ['stage', 'stage.track'],
    });

    if (!upstream) {
      throw new NotFoundException('Upstream not found');
    }

    // 권한 검증 - upstream을 통해 트랙에 접근 권한 확인
    if (!upstream.stage?.track?.id) {
      throw new NotFoundException('Track information not found for this upstream');
    }
    await this.validateTrackAccess(upstream.stage.track.id, userId);

    if (!upstream.guide_path) {
      throw new NotFoundException('No guide file found for this upstream');
    }

    // guide_path를 기반으로 해당 guide 레코드를 찾아서 waveform_data_path 가져오기
    const guide = await this.guideRepository.findOne({
      where: { mixed_file_path: upstream.guide_path },
    });

    if (!guide || !guide.waveform_data_path) {
      throw new NotFoundException('No waveform data found for this guide');
    }

    // S3 presigned URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedUrl(guide.waveform_data_path);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    const fileName = guide.waveform_data_path.split('/').pop() || 'waveform.json';

    return {
      guidePath: guide.waveform_data_path,
      presignedUrl,
      urlExpiresAt: expiresAt,
      fileName,
    };
  }

  /**
   * Stem의 Waveform 데이터 URL 조회
   * 
   * @param stemId - 스템 ID
   * @param userId - 요청한 사용자 ID
   * @returns waveform JSON 데이터의 presigned URL
   * 
   * 권한 검증: Stem → Upstream → Stage → Track 경로로 트랙 접근 권한 확인
   */
  async getStemWaveformUrl(
    stemId: string, 
    userId: string
  ): Promise<GuidePathStreamingResponse> {
    // Stem과 관련 엔티티들을 함께 조회
    const stem = await this.stemRepository.findOne({
      where: { id: stemId },
      relations: ['upstream', 'upstream.stage', 'upstream.stage.track'],
    });

    if (!stem) {
      throw new NotFoundException('Stem not found');
    }

    // 권한 검증 - stem을 통해 트랙에 접근 권한 확인
    if (!stem.upstream?.stage?.track?.id) {
      throw new NotFoundException('Track information not found for this stem');
    }
    await this.validateTrackAccess(stem.upstream.stage.track.id, userId);

    if (!stem.audio_wave_path) {
      throw new NotFoundException('No waveform data found for this stem');
    }

    // S3 presigned URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedUrl(stem.audio_wave_path);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    const fileName = stem.audio_wave_path.split('/').pop() || 'waveform.json';

    return {
      guidePath: stem.audio_wave_path,
      presignedUrl,
      urlExpiresAt: expiresAt,
      fileName,
    };
  }

}
