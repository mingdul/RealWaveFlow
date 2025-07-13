import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Stem } from '../stem/stem.entity';
import { Track } from '../track/track.entity';
import { Stage } from '../stage/stage.entity';
import { VersionStem } from '../version-stem/version-stem.entity';
import { S3Service } from './s3.service';
import { 
  StemDownloadInfo, 
  StemDownloadInfoDto, 
  SimpleStemDownloadInfo 
} from './dto/download.dto';

/**
 * Download Service
 * 
 * 음악 스템 파일들의 다운로드 URL을 제공하는 서비스
 * - 작업 중인 stems (Stem 엔티티)와 완성된 버전 stems (VersionStem 엔티티) 모두 지원
 * - 트랙 소유자 또는 협업자만 접근 가능하도록 권한 검증
 * - S3 presigned download URL을 통해 안전한 파일 다운로드 제공
 * - 원본 파일명 그대로 사용
 */
@Injectable()
export class DownloadService {
  constructor(
    @InjectRepository(Stem)
    private stemRepository: Repository<Stem>,
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
    @InjectRepository(Stage)
    private stageRepository: Repository<Stage>,
    @InjectRepository(VersionStem)
    private versionStemRepository: Repository<VersionStem>,
    private s3Service: S3Service,
  ) {}

  /**
   * 프론트엔드에서 제공받은 stem 정보로 presigned download URL 생성
   * 
   * @param stemInfo - 프론트엔드에서 제공한 stem 정보
   * @param userId - 요청한 사용자 ID
   * @returns presigned download URL과 만료 시간
   * 
   * 권한 검증: trackId를 통해 트랙 접근 권한만 확인
   */
  async getStemDownloadUrl(stemInfo: StemDownloadInfoDto, userId: string): Promise<SimpleStemDownloadInfo> {
    // 권한 검증 - trackId를 통해 트랙 접근 권한 확인
    await this.validateTrackAccess(stemInfo.trackId, userId);

    // S3 presigned download URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedDownloadUrl(stemInfo.filePath);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      stemId: stemInfo.stemId,
      presignedUrl,
      urlExpiresAt: expiresAt,
      fileName: stemInfo.fileName,
    };
  }

  /**
   * 프론트엔드에서 제공받은 stems 정보로 배치 presigned download URL 생성
   * 
   * @param stems - 프론트엔드에서 제공한 stems 정보 배열
   * @param userId - 요청한 사용자 ID
   * @returns 모든 stems의 presigned download URL과 만료 시간
   * 
   * 권한 검증: 각 stem의 trackId를 통해 트랙 접근 권한 확인
   */
  async getBatchStemDownloadUrls(stems: StemDownloadInfoDto[], userId: string): Promise<{
    stems: SimpleStemDownloadInfo[];
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

    // presigned download URL 생성
    const presignedUrls = await this.s3Service.getBatchPresignedDownloadUrls(
      stems.map(stem => stem.filePath)
    );

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // 결과 구성
    const downloadStems: SimpleStemDownloadInfo[] = stems.map(stem => ({
      stemId: stem.stemId,
      presignedUrl: presignedUrls[stem.filePath],
      urlExpiresAt: expiresAt,
      fileName: stem.fileName,
    }));

    return {
      stems: downloadStems,
      urlExpiresAt: expiresAt,
    };
  }

  /**
   * 개별 Stem 다운로드 URL 조회 (작업 중인 stems)
   * 
   * @param stemId - 스템 ID
   * @param userId - 요청한 사용자 ID
   * @returns 다운로드 URL과 메타데이터
   * 
   * 권한 검증: Stem → Upstream → Stage → Track 경로로 트랙 접근 권한 확인
   */
  async getStemDownloadUrlById(stemId: string, userId: string): Promise<{
    stemId: string;
    fileName: string;
    presignedUrl: string;
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

    // S3 presigned download URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedDownloadUrl(stem.file_path);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      stemId: stem.id,
      fileName: stem.file_name,
      presignedUrl,
      urlExpiresAt: expiresAt,
    };
  }

  /**
   * 개별 VersionStem 다운로드 URL 조회 (완성된 버전 stems)
   * 
   * @param stemId - 버전 스템 ID
   * @param userId - 요청한 사용자 ID
   * @returns 다운로드 URL과 메타데이터
   * 
   * 권한 검증: VersionStem → Stage → Track 경로로 트랙 접근 권한 확인
   */
  async getVersionStemDownloadUrl(stemId: string, userId: string): Promise<{
    stemId: string;
    fileName: string;
    presignedUrl: string;
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

    // S3 presigned download URL 생성 (1시간 유효)
    const presignedUrl = await this.s3Service.getPresignedDownloadUrl(versionStem.file_path);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      stemId: versionStem.id,
      fileName: versionStem.file_name,
      presignedUrl,
      urlExpiresAt: expiresAt,
    };
  }

  /**
   * 트랙의 모든 작업 중인 stems 다운로드 URL 조회 (Upstream을 통해)
   * 
   * @param trackId - 트랙 ID
   * @param userId - 요청한 사용자 ID
   * @param version - 버전 필터 (선택사항, 현재 미사용)
   * @returns 트랙 정보와 모든 stems의 다운로드 URL
   * 
   * 조회 경로: Track → Stages → Upstreams → Stems
   */
  async getTrackStemsDownloadUrls(
    trackId: string, 
    userId: string, 
    version?: string
  ): Promise<{
    trackId: string;
    trackInfo: any;
    stems: StemDownloadInfo[];
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

    // 모든 스템 파일의 presigned download URL 생성
    const presignedUrls = await this.s3Service.getBatchPresignedDownloadUrls(
      allStems.map(stem => stem.file_path)
    );

    // 다운로드 정보 구성
    const downloadStems: StemDownloadInfo[] = allStems.map(stem => ({
      id: stem.id,
      fileName: stem.file_name,
      category: stem.category?.name || null,
      tag: null, // Stem 엔티티에는 tag 필드가 없음
      key: stem.key,
      description: null, // Stem 엔티티에는 description 필드가 없음
      presignedUrl: presignedUrls[stem.file_path],
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
      stems: downloadStems,
      totalStems: allStems.length,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  /**
   * 배치 다운로드 - Stem과 VersionStem 모두 지원
   * 
   * @param stemIds - 스템 ID 배열 (Stem과 VersionStem ID 혼재 가능)
   * @param userId - 요청한 사용자 ID
   * @returns 모든 stems의 다운로드 URL
   * 
   * 권한 검증: 각 stem의 트랙에 대한 접근 권한을 개별적으로 확인
   */
  async getBatchDownloadUrls(stemIds: string[], userId: string): Promise<{
    downloads: Array<{
      stemId: string;
      fileName: string;
      presignedUrl: string;
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

    // presigned download URL 생성
    const allFilePaths = [
      ...stems.map(stem => stem.file_path),
      ...versionStems.map(versionStem => versionStem.file_path)
    ];
    const presignedUrls = await this.s3Service.getBatchPresignedDownloadUrls(allFilePaths);

    // 결과 구성
    const downloads = [
      ...stems.map(stem => ({
        stemId: stem.id,
        fileName: stem.file_name,
        presignedUrl: presignedUrls[stem.file_path],
      })),
      ...versionStems.map(versionStem => ({
        stemId: versionStem.id,
        fileName: versionStem.file_name,
        presignedUrl: presignedUrls[versionStem.file_path],
      }))
    ];

    return {
      downloads,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  /**
   * 특정 버전의 마스터 stems 다운로드 URL 조회 (VersionStem)
   * 
   * @param trackId - 트랙 ID
   * @param version - 버전 번호
   * @param userId - 요청한 사용자 ID
   * @returns 특정 버전의 모든 stems 다운로드 URL
   * 
   * 조회 경로: Track → Stage (특정 버전) → VersionStems
   */
  async getMasterStemDownloadUrls(
    trackId: string,
    version: number,
    userId: string,
  ): Promise<{
    trackId: string;
    version: number;
    trackInfo: any;
    stems: StemDownloadInfo[];
    totalStems: number;
    urlExpiresAt: string;
  }> {
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

    if (!stage || !stage.version_stems || stage.version_stems.length === 0) {
      return {
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
      };
    }

    // 모든 VersionStem 파일의 presigned download URL 생성
    const presignedUrls = await this.s3Service.getBatchPresignedDownloadUrls(
      stage.version_stems.map(stem => stem.file_path)
    );

    // 다운로드 정보 구성
    const downloadStems: StemDownloadInfo[] = stage.version_stems.map(stem => ({
      id: stem.id,
      fileName: stem.file_name,
      category: stem.category?.name || null,
      tag: null, // VersionStem에는 tag 필드가 없음
      key: stem.key,
      description: null, // VersionStem에는 description 필드가 없음
      presignedUrl: presignedUrls[stem.file_path],
      uploadedBy: {
        id: stage.user?.id || 'unknown',
        username: stage.user?.username || 'unknown',
      },
      uploadedAt: stem.uploaded_at.toISOString(),
    }));

    return {
      trackId,
      version,
      trackInfo: {
        title: track.title,
        description: track.description,
        genre: track.genre,
        bpm: track.bpm,
        key_signature: track.key_signature,
      },
      stems: downloadStems,
      totalStems: stage.version_stems.length,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  /**
   * Upstream의 stems 다운로드 URL 조회
   * 
   * @param upstreamId - Upstream ID
   * @param userId - 요청한 사용자 ID
   * @returns 해당 upstream의 모든 stems 다운로드 URL
   * 
   * 권한 검증: Upstream → Stage → Track 경로로 트랙 접근 권한 확인
   */
  async getUpstreamStemsDownloadUrls(
    upstreamId: string,
    userId: string,
  ): Promise<{
    upstreamId: string;
    stems: StemDownloadInfo[];
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

    // presigned download URL 생성
    const presignedUrls = await this.s3Service.getBatchPresignedDownloadUrls(
      stems.map(stem => stem.file_path)
    );

    // 다운로드 정보 구성
    const downloadStems: StemDownloadInfo[] = stems.map(stem => ({
      id: stem.id,
      fileName: stem.file_name,
      category: stem.category?.name || null,
      tag: null,
      key: stem.key,
      description: null,
      presignedUrl: presignedUrls[stem.file_path],
      uploadedBy: {
        id: stem.upstream?.user?.id || 'unknown',
        username: stem.upstream?.user?.username || 'unknown',
      },
      uploadedAt: stem.uploaded_at.toISOString(),
    }));

    return {
      upstreamId,
      stems: downloadStems,
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
} 