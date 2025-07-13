import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Download S3 Service
 * 
 * S3에서 파일 다운로드를 위한 presigned URL을 생성하는 서비스
 * - 다운로드 전용 presigned URL 생성 (Content-Disposition: attachment)
 * - 배치 다운로드 URL 생성 지원
 * - 원본 파일명 그대로 사용
 * - AWS SDK v3 사용
 */
@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
  }

  /**
   * 단일 파일 다운로드용 presigned URL 생성
   * 
   * @param key - S3 객체 키 (파일 경로)
   * @param expiresIn - URL 만료 시간 (초, 기본값: 1시간)
   * @returns presigned download URL
   */
  async getPresignedDownloadUrl(
    key: string, 
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ResponseContentDisposition: 'attachment',
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * 배치 다운로드용 presigned URL 생성
   * 
   * @param fileKeys - S3 객체 키 배열
   * @param expiresIn - URL 만료 시간 (초, 기본값: 1시간)
   * @returns 파일 키를 키로 하는 presigned URL 객체
   */
  async getBatchPresignedDownloadUrls(
    fileKeys: string[],
    expiresIn: number = 3600
  ): Promise<{ [key: string]: string }> {
    const presignedUrls: { [key: string]: string } = {};

    await Promise.all(
      fileKeys.map(async (key) => {
        presignedUrls[key] = await this.getPresignedDownloadUrl(key, expiresIn);
      })
    );

    return presignedUrls;
  }
} 