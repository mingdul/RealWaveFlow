import { Injectable } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

/**
 * S3 Service
 * 
 * AWS S3와의 상호작용을 담당하는 서비스
 * - Presigned URL 생성을 통한 안전한 파일 접근 제공
 * - 개별 파일 및 배치 파일 URL 생성 지원
 * - 환경 변수를 통한 AWS 설정 관리
 */
@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    // AWS S3 클라이언트 초기화
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
    });
    this.bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
  }

  /**
   * 단일 파일의 Presigned URL 생성
   * 
   * @param key - S3 객체 키 (파일 경로)
   * @param expiresIn - URL 만료 시간 (초, 기본값: 1시간)
   * @returns Presigned URL 문자열
   * 
   * 사용 예시:
   * - 개별 stem 파일 스트리밍
   * - 임시 파일 접근
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * 여러 파일의 Presigned URL 일괄 생성
   * 
   * @param keys - S3 객체 키 배열
   * @param expiresIn - URL 만료 시간 (초, 기본값: 1시간)
   * @returns 키-URL 매핑 객체
   * 
   * 사용 예시:
   * - 트랙의 모든 stems 스트리밍
   * - 배치 파일 처리
   * - 플레이리스트 생성
   */
  async getBatchPresignedUrls(keys: string[], expiresIn: number = 3600): Promise<{ [key: string]: string }> {
    const urlPromises = keys.map(async (key) => {
      const url = await this.getPresignedUrl(key, expiresIn);
      return { key, url };
    });

    const results = await Promise.all(urlPromises);
    return results.reduce((acc, { key, url }) => {
      acc[key] = url;
      return acc;
    }, {});
  }
}
