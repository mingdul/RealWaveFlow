import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { StemFile } from '../stem-file/stem-file.entity';
import { Track } from '../track/track.entity';
import { MasterStem } from '../master-stem/master-stem.entity';
import { S3Service } from './s3.service';
import { StemStreamingInfo, AudioMetadata } from './dto/streaming.dto';

@Injectable()
export class StreamingService {
  constructor(
    @InjectRepository(StemFile)
    private stemFileRepository: Repository<StemFile>,
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
    @InjectRepository(MasterStem)
    private masterStemRepository: Repository<MasterStem>,
    private s3Service: S3Service,
  ) {}

  async getStemStreamingUrl(stemId: string, userId: string): Promise<{
    stemId: string;
    fileName: string;
    presignedUrl: string;
    metadata: AudioMetadata;
    urlExpiresAt: string;
  }> {
    const stem = await this.stemFileRepository.findOne({
      where: { id: stemId },
      relations: ['uploaded_by', 'track'],
    });

    if (!stem) {
      throw new NotFoundException('Stem file not found');
    }

    // 권한 검증 - 트랙 소유자이거나 협업자인지 확인
    if (!stem.track?.id) {
      throw new NotFoundException('Track information not found for this stem');
    }
    await this.validateTrackAccess(stem.track.id, userId);

    const presignedUrl = await this.s3Service.getPresignedUrl(stem.file_path);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1시간 후

    return {
      stemId: stem.id,
      fileName: stem.file_name,
      presignedUrl,
      metadata: this.extractMetadata(stem),
      urlExpiresAt: expiresAt,
    };
  }

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

    // 스템 파일들 조회 (버전 필터링은 추후 구현)
    const stems = await this.stemFileRepository.find({
      where: { track: { id: trackId } },
      relations: ['uploaded_by', 'category'],
      order: { uploaded_at: 'DESC' },
    });

    if (stems.length === 0) {
      return {
        trackId,
        trackInfo: {
          name: track.name,
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
    const stemKeys = stems.map(stem => stem.file_path);
    const presignedUrls = await this.s3Service.getBatchPresignedUrls(stemKeys);

    const streamingStems: StemStreamingInfo[] = stems.map(stem => ({
      id: stem.id,
      fileName: stem.file_name,
      category: stem.category?.id || null, // DB 스키마에 맞게 수정
      tag: stem.tag,
      key: stem.key,
      description: stem.description,
      presignedUrl: presignedUrls[stem.file_path],
      metadata: this.extractMetadata(stem),
      uploadedBy: {
        id: stem.uploaded_by.id,
        username: stem.uploaded_by.username,
      },
      uploadedAt: stem.uploaded_at.toISOString(), // Date를 ISO 문자열로 변환
    }));

    return {
      trackId,
      trackInfo: {
        name: track.name,
        description: track.description,
        genre: track.genre,
        bpm: track.bpm,
        key_signature: track.key_signature,
      },
      stems: streamingStems,
      totalStems: stems.length,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  async getBatchStreamingUrls(stemIds: string[], userId: string): Promise<{
    streams: Array<{
      stemId: string;
      fileName: string;
      presignedUrl: string;
      metadata: AudioMetadata;
    }>;
    urlExpiresAt: string;
  }> {
    const stems = await this.stemFileRepository.find({
      where: { id: In(stemIds) },
      relations: ['uploaded_by', 'track'],
    });

    if (stems.length === 0) {
      throw new NotFoundException('No stem files found');
    }

    // 모든 스템이 동일한 트랙에 속하는지 확인하고 권한 검증
    const trackIds = [...new Set(stems.map(stem => stem.track?.id).filter(Boolean))];
    for (const trackId of trackIds) {
      await this.validateTrackAccess(trackId, userId);
    }

    const stemKeys = stems.map(stem => stem.file_path);
    const presignedUrls = await this.s3Service.getBatchPresignedUrls(stemKeys);

    const streams = stems.map(stem => ({
      stemId: stem.id,
      fileName: stem.file_name,
      presignedUrl: presignedUrls[stem.file_path],
      metadata: this.extractMetadata(stem),
    }));

    return {
      streams,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  // 세션 기반 스템 조회 (추가)
  async getSessionStemsStreamingUrls(
    sessionId: string, 
    userId: string
  ): Promise<{
    sessionId: string;
    stems: StemStreamingInfo[];
    totalStems: number;
    urlExpiresAt: string;
  }> {
    // 세션에 속한 스템 파일들 조회
    const stems = await this.stemFileRepository.find({
      where: { session: { id: sessionId } },
      relations: ['uploaded_by', 'category', 'track'],
      order: { uploaded_at: 'DESC' },
    });

    if (stems.length === 0) {
      return {
        sessionId,
        stems: [],
        totalStems: 0,
        urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
    }

    // 권한 검증 - 각 스템의 트랙에 대한 접근 권한 확인
    const trackIds = [...new Set(stems.map(stem => stem.track?.id).filter(Boolean))];
    for (const trackId of trackIds) {
      await this.validateTrackAccess(trackId, userId);
    }

    // presigned URL 생성
    const stemKeys = stems.map(stem => stem.file_path);
    const presignedUrls = await this.s3Service.getBatchPresignedUrls(stemKeys);

    const streamingStems: StemStreamingInfo[] = stems.map(stem => ({
      id: stem.id,
      fileName: stem.file_name,
      category: stem.category?.id || null,
      tag: stem.tag,
      key: stem.key,
      description: stem.description,
      presignedUrl: presignedUrls[stem.file_path],
      metadata: this.extractMetadata(stem),
      uploadedBy: {
        id: stem.uploaded_by.id,
        username: stem.uploaded_by.username,
      },
      uploadedAt: stem.uploaded_at.toISOString(),
    }));

    return {
      sessionId,
      stems: streamingStems,
      totalStems: stems.length,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  async getMasterStemStreamingUrls(
    trackId: string,
    take: number,
    userId: string,
  ): Promise<{
    trackId: string;
    take: number;
    trackInfo: any;
    stems: StemStreamingInfo[];
    totalStems: number;
    urlExpiresAt: string;
  }> {
    // 트랙 존재 및 권한 확인
    const track = await this.validateTrackAccess(trackId, userId);

    // 특정 take 이하의 가장 최신 마스터 스템들을 카테고리별로 조회
    const trackWithCategories = await this.trackRepository
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.category', 'category')
      .where('track.id = :trackId', { trackId })
      .getOne();

    if (!trackWithCategories || !trackWithCategories.category) {
      throw new NotFoundException('No categories found for this track');
    }

    const masterStems = [];
    for (const category of trackWithCategories.category) {
      const latestStem = await this.masterStemRepository
        .createQueryBuilder('masterStem')
        .where('masterStem.track.id = :trackId', { trackId })
        .andWhere('masterStem.category.id = :categoryId', { categoryId: category.id })
        .andWhere('masterStem.take <= :take', { take })
        .orderBy('masterStem.take', 'DESC')
        .addOrderBy('masterStem.create_at', 'DESC')
        .leftJoinAndSelect('masterStem.uploaded_by', 'uploaded_by')
        .leftJoinAndSelect('masterStem.category', 'category')
        .getOne();

      if (latestStem) {
        masterStems.push(latestStem);
      }
    }

    if (masterStems.length === 0) {
      return {
        trackId,
        take,
        trackInfo: {
          name: track.name,
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

    // 모든 마스터 스템 파일의 presigned URL 생성
    const stemKeys = masterStems.map(stem => stem.file_path);
    const presignedUrls = await this.s3Service.getBatchPresignedUrls(stemKeys);

    const streamingStems: StemStreamingInfo[] = masterStems.map(stem => ({
      id: stem.id,
      fileName: stem.file_name,
      category: stem.category?.id || null,
      tag: stem.tag,
      key: stem.key,
      description: stem.description,
      presignedUrl: presignedUrls[stem.file_path],
      metadata: this.extractMasterStemMetadata(stem),
      uploadedBy: {
        id: stem.uploaded_by.id,
        username: stem.uploaded_by.username,
      },
      uploadedAt: stem.create_at.toISOString(),
    }));

    return {
      trackId,
      take,
      trackInfo: {
        name: track.name,
        description: track.description,
        genre: track.genre,
        bpm: track.bpm,
        key_signature: track.key_signature,
      },
      stems: streamingStems,
      totalStems: masterStems.length,
      urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  private async validateTrackAccess(trackId: string, userId: string): Promise<Track> {
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
      relations: ['owner_id', 'collaborators'],
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
      collaborator => collaborator.user_id.toString() === userId
    );

    if (!isCollaborator) {
      throw new ForbiddenException('Access denied to this track');
    }

    return track;
  }

  private extractMetadata(stem: StemFile): AudioMetadata {
    // 현재는 기본 메타데이터만 반환
    // 추후 stem_analysis_id를 통해 분석 결과에서 가져올 수 있음
    return {
      duration: undefined, // TODO: stem_analysis 테이블에서 가져오기
      fileSize: undefined, // TODO: S3에서 파일 크기 정보 가져오기
      sampleRate: undefined,
      channels: undefined,
      format: this.getFileFormat(stem.file_name),
    };
  }

  private extractMasterStemMetadata(stem: MasterStem): AudioMetadata {
    return {
      duration: null, // MasterStem 엔티티에 duration 필드가 없으므로 null로 설정
      fileSize: null, // MasterStem 엔티티에 fileSize 필드가 없으므로 null로 설정
      sampleRate: null,
      channels: null,
      format: this.getFileFormat(stem.file_name),
    };
  }

  private getFileFormat(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }
}
