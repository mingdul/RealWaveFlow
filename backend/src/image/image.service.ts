import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Track } from '../track/track.entity';
import { UploadUrlDto } from './dto/upload-url.dto';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
  ) {}

  private readonly s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  private readonly bucketName = process.env.AWS_S3_BUCKET_NAME || 'waveflow-bucket';

  /**
   * 이미지 업로드용 presigned URL 생성
   */
  async generateUploadUrl(userId: string, dto: UploadUrlDto) {
    const { fileName, contentType } = dto;
    try {

      // S3 키 생성
      const timestamp = Date.now();
      const key = `images/${userId}/${timestamp}_${fileName}`;

      // Presigned URL 생성
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3, command, {
        expiresIn: 3600 // 1시간
      });

      return {
        uploadUrl,
        key
      };
    } catch (error) {
      console.error('Upload URL generation error:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('업로드 URL 생성에 실패했습니다.');
    }
  }


  /**
   * 이미지 다운로드용 presigned URL 생성
   */
  async getImageUrl(trackId: string) {
    try {
      // 트랙 조회
      const track = await this.trackRepository.findOne({
        where: { id: trackId }
      });

      if (!track) {
        throw new NotFoundException('트랙을 찾을 수 없습니다.');
      }

      if (!track.image_url) {
        throw new NotFoundException('이미지가 존재하지 않습니다.');
      }

      // Presigned URL 생성
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: track.image_url,
      });

      const imageUrl = await getSignedUrl(this.s3, command, {
        expiresIn: 3600 // 1시간
      });

      return { imageUrl };
    } catch (error) {
      console.error('Image URL generation error:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('이미지 URL 생성에 실패했습니다.');
    }
  }
}
