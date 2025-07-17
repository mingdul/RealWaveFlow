import { IsArray, IsOptional, IsString, IsUUID, IsNotEmpty, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 배치 스트리밍 요청 DTO
 * 
 * 여러 stems의 스트리밍 URL을 한 번에 요청할 때 사용
 * Stem과 VersionStem ID가 혼재되어도 처리 가능
 */
export class BatchStreamRequestDto {
  @IsArray()
  @IsUUID('4', { each: true })
  stemIds: string[];
}

/**
 * 프론트엔드에서 제공하는 stem 정보 DTO
 * 
 * 프론트엔드에서 이미 가지고 있는 stem 정보를 제공받아
 * 권한만 확인하고 presigned URL만 반환하는 방식
 */
export class StemInfoDto {
  @IsUUID()
  stemId: string;

  @IsString()
  fileName: string;

  @IsString()
  filePath: string; // S3 경로

  @IsUUID()
  trackId: string; // 권한 확인용
}

/**
 * 프론트엔드에서 제공하는 stems 정보 배치 요청 DTO
 */
export class BatchStemInfoRequestDto {
  @IsArray()
  stems: StemInfoDto[];
}

/**
 * 트랙 stems 조회 쿼리 DTO
 * 
 * 트랙의 stems를 조회할 때 사용하는 쿼리 파라미터
 * 현재는 버전 필터링을 위한 version 파라미터 포함
 */
export class TrackStemsQueryDto {
  @IsOptional()
  @IsString()
  version?: string;
}

/**
 * 스템 스트리밍 정보 인터페이스
 * 
 * 스트리밍 API 응답에서 사용하는 표준화된 스템 정보 구조
 * 프론트엔드에서 일관된 형태로 스템 정보를 처리할 수 있도록 함
 */
export interface StemStreamingInfo {
  id: string;                    // 스템 고유 ID
  fileName: string;              // 파일명
  category?: string;             // 카테고리 (예: drums, bass, lead)
  tag?: string;                  // 태그 (예: kick, synth)
  key?: string;                  // 음악 키 (예: C, F#)
  description?: string;          // 설명
  presignedUrl: string;          // S3 presigned URL
  metadata: AudioMetadata;       // 오디오 메타데이터
  uploadedBy: {                  // 업로드한 사용자 정보
    id: string;
    username: string;
  };
  uploadedAt: string;            // 업로드 시간 (ISO 문자열)
}

/**
 * 단순화된 스템 스트리밍 정보 인터페이스
 * 
 * 프론트엔드에서 정보를 제공받는 방식에서 사용
 * presigned URL만 추가로 제공
 */
export interface SimpleStemStreamingInfo {
  stemId: string;                // 스템 고유 ID
  presignedUrl: string;          // S3 presigned URL
  urlExpiresAt: string;          // URL 만료 시간
}

/**
 * 오디오 메타데이터 인터페이스
 * 
 * 오디오 파일의 기술적 정보를 담는 구조
 * 현재는 기본 정보만 포함, 추후 확장 가능
 */
export interface AudioMetadata {
  duration?: number;             // 재생 시간 (초)
  fileSize?: number;             // 파일 크기 (bytes)
  sampleRate?: number;           // 샘플 레이트 (Hz)
  channels?: number;             // 채널 수 (1: 모노, 2: 스테레오)
  format?: string;               // 파일 포맷 (wav, mp3 등)
}

/**
 * 스트리밍 API 응답 인터페이스
 * 
 * 모든 스트리밍 API 엔드포인트의 표준 응답 구조
 * 성공/실패 여부와 데이터를 일관되게 제공
 */
export interface StreamingResponse<T = any> {
  success: boolean;              // 요청 성공 여부
  message?: string;              // 오류 메시지 (실패 시)
  data?: T;                      // 응답 데이터 (성공 시)
  urlExpiresAt?: string;         // URL 만료 시간 (선택사항)
}

/**
 * Guide Path 스트리밍 요청 DTO
 */
export class GuidePathStreamingDto {
  @ApiProperty({ description: 'Guide 파일 경로', example: 'guides/track-123/stage-456/mixed.wav' })
  @IsString()
  @IsNotEmpty()
  guidePath: string;

  @ApiProperty({ description: '트랙 ID (권한 검증용)', example: 'uuid-track-id' })
  @IsString()
  @IsNotEmpty()
  trackId: string;
}

/**
 * Guide Path 배치 스트리밍 요청 DTO
 */
export class BatchGuidePathStreamingDto {
  @ApiProperty({ 
    description: 'Guide Path 정보 배열',
    type: [GuidePathStreamingDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidePathStreamingDto)
  guidePaths: GuidePathStreamingDto[];
}

/**
 * Guide Path 스트리밍 응답 DTO
 */
export class GuidePathStreamingResponse {
  @ApiProperty({ description: 'Guide 파일 경로' })
  guidePath: string;

  @ApiProperty({ description: 'Presigned URL' })
  presignedUrl: string;

  @ApiProperty({ description: 'URL 만료 시간' })
  urlExpiresAt: string;

  @ApiProperty({ description: '파일명 (경로에서 추출)' })
  fileName: string;
}

export class StemPeaksPresignedUrlDto {
  @ApiProperty({ description: '트랙 ID', example: 'uuid-track-id' })
  @IsString()
  @IsNotEmpty()
  trackId: string;

  @ApiProperty({ description: '스템 ID', example: 'uuid-stem-id' })
  @IsString()
  @IsNotEmpty()
  stemId: string;
}

export class GuideWaveformPresignedUrlDto {
  @ApiProperty({ description: '업스트림 ID', example: 'uuid-upstream-id' })
  @IsString()
  @IsNotEmpty()
  upstreamId: string;
}
