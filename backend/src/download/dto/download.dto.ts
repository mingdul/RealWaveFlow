import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * 프론트엔드에서 제공하는 stem 정보 DTO (다운로드용)
 * 
 * 프론트엔드에서 이미 가지고 있는 stem 정보를 제공받아
 * 권한만 확인하고 presigned download URL만 반환하는 방식
 */
export class StemDownloadInfoDto {
  @IsUUID()
  stemId: string;

  @IsString()
  fileName: string; // 원본 파일명 (참고용)

  @IsString()
  filePath: string; // S3 경로

  @IsUUID()
  trackId: string; // 권한 확인용
}

/**
 * 프론트엔드에서 제공하는 stems 정보 배치 다운로드 요청 DTO
 */
export class BatchStemDownloadRequestDto {
  @IsArray()
  stems: StemDownloadInfoDto[];
}

/**
 * 배치 다운로드 요청 DTO (기존 방식)
 * 
 * 여러 stems의 다운로드 URL을 한 번에 요청할 때 사용
 * Stem과 VersionStem ID가 혼재되어도 처리 가능
 */
export class BatchDownloadRequestDto {
  @IsArray()
  @IsUUID('4', { each: true })
  stemIds: string[];
}

/**
 * 트랙 stems 다운로드 쿼리 DTO
 * 
 * 트랙의 stems를 다운로드할 때 사용하는 쿼리 파라미터
 */
export class TrackStemsDownloadQueryDto {
  @IsOptional()
  @IsString()
  version?: string;
}

/**
 * 단순화된 스템 다운로드 정보 인터페이스
 * 
 * 프론트엔드에서 정보를 제공받는 방식에서 사용
 * presigned download URL만 추가로 제공
 */
export interface SimpleStemDownloadInfo {
  stemId: string;                // 스템 고유 ID
  presignedUrl: string;          // S3 presigned download URL
  urlExpiresAt: string;          // URL 만료 시간
  fileName: string;              // 원본 파일명 (참고용)
}

/**
 * 스템 다운로드 정보 인터페이스 (기존 방식)
 * 
 * 다운로드 API 응답에서 사용하는 표준화된 스템 정보 구조
 * 프론트엔드에서 일관된 형태로 스템 정보를 처리할 수 있도록 함
 */
export interface StemDownloadInfo {
  id: string;                    // 스템 고유 ID
  fileName: string;              // 파일명
  category?: string;             // 카테고리 (예: drums, bass, lead)
  tag?: string;                  // 태그 (예: kick, synth)
  key?: string;                  // 음악 키 (예: C, F#)
  description?: string;          // 설명
  presignedUrl: string;          // S3 presigned download URL
  uploadedBy: {                  // 업로드한 사용자 정보
    id: string;
    username: string;
  };
  uploadedAt: string;            // 업로드 시간 (ISO 문자열)
}

/**
 * 다운로드 API 응답 인터페이스
 * 
 * 모든 다운로드 API 엔드포인트의 표준 응답 구조
 * 성공/실패 여부와 데이터를 일관되게 제공
 */
export interface DownloadResponse<T = any> {
  success: boolean;              // 요청 성공 여부
  message?: string;              // 오류 메시지 (실패 시)
  data?: T;                      // 응답 데이터 (성공 시)
  urlExpiresAt?: string;         // URL 만료 시간 (선택사항)
} 