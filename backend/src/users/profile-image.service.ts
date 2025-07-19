import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  S3Client, 
  PutObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ProfileImageUploadDto } from './dto/profile-image-upload.dto';
import { ProfileImageCompleteDto } from './dto/profile-image-complete.dto';
import { User } from './user.entity';

@Injectable()
export class ProfileImageService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private readonly s3 = new S3Client({
    region: process.env.AWS_REGION,
  });

  private readonly bucketName = process.env.AWS_S3_BUCKET_NAME || 'waveflow-bucket';

  /**
   * 프로필 이미지용 S3 키 생성
   */
  private generateProfileImageS3Key(userId: string, filename: string): string {
    // 업로드 시각 기반 타임스탬프 (YYYYMMDD_HHmmss)
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = 
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) + '_' +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    // 프로필 이미지 전용 S3 Key
    return `profile-images/${userId}/${timestamp}_${filename}`;
  }

  /**
   * 파일 타입 검증 (이미지만 허용)
   */
  private validateImageFile(contentType: string, filename: string): void {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (!allowedTypes.includes(contentType.toLowerCase())) {
      throw new BadRequestException('이미지 파일만 업로드할 수 있습니다.');
    }

    const fileExtension = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException('지원하지 않는 파일 형식입니다.');
    }
  }

  /**
   * 파일 크기 검증 (최대 5MB)
   */
  private validateFileSize(fileSize: number): void {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileSize > maxSize) {
      throw new BadRequestException('파일 크기는 5MB를 초과할 수 없습니다.');
    }
  }

  /**
   * 프로필 이미지 업로드 URL 생성
   */
  async generateUploadUrl(dto: ProfileImageUploadDto, userId: string) {
    try {
      const { filename, contentType, fileSize } = dto;
      
      // 파일 유효성 검증
      this.validateImageFile(contentType, filename);
      this.validateFileSize(fileSize);
      
      // S3 키 생성
      const key = this.generateProfileImageS3Key(userId, filename);

      // Presigned URL 생성
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        Metadata: {
          userId,
          originalFilename: filename,
          fileSize: fileSize.toString(),
          uploadType: 'profile-image'
        },
      });

      const uploadUrl = await getSignedUrl(this.s3, command, { 
        expiresIn: 3600 // 1시간
      });

      return {
        uploadUrl,
        key,
        expiresIn: 3600
      };
    } catch (error) {
      console.error('Profile image upload URL generation error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('프로필 이미지 업로드 URL 생성에 실패했습니다.');
    }
  }

  /**
   * 프로필 이미지 업로드 완료 처리
   */
  async completeUpload(dto: ProfileImageCompleteDto, userId: string) {
    try {
      const { key } = dto;
      
      // 사용자 조회
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException('사용자를 찾을 수 없습니다.');
      }

      // 기존 프로필 이미지가 있다면 S3에서 삭제
      if (user.image_url) {
        await this.deleteOldProfileImage(user.image_url);
      }

      // 새 이미지 URL 생성
      const imageUrl = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      // 사용자 엔티티의 image_url 필드 업데이트
      await this.userRepository.update(userId, { image_url: imageUrl });

      // 업데이트된 사용자 정보 반환
      const updatedUser = await this.userRepository.findOne({ where: { id: userId } });

      return {
        imageUrl,
        message: '프로필 이미지가 성공적으로 업데이트되었습니다.',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          image_url: updatedUser.image_url
        }
      };
    } catch (error) {
      console.error('Profile image upload completion error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('프로필 이미지 업로드 완료 처리에 실패했습니다.');
    }
  }

  /**
   * 기존 프로필 이미지 S3에서 삭제
   */
  private async deleteOldProfileImage(imageUrl: string): Promise<void> {
    try {
      // S3 URL에서 키 추출
      const urlParts = imageUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part.includes('.s3.'));
      if (bucketIndex === -1) return;

      const key = urlParts.slice(bucketIndex + 1).join('/');
      
      // profile-images로 시작하는 키만 삭제 (안전장치)
      if (!key.startsWith('profile-images/')) {
        console.warn('안전하지 않은 이미지 키 삭제 시도:', key);
        return;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3.send(command);
      console.log('기존 프로필 이미지 삭제 완료:', key);
    } catch (error) {
      // 기존 이미지 삭제 실패는 새 업로드를 방해하지 않음
      console.warn('기존 프로필 이미지 삭제 실패:', error);
    }
  }
}