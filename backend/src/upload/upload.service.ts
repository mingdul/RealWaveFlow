import { Injectable, BadRequestException, InternalServerErrorException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  S3Client, 
  CreateMultipartUploadCommand, 
  CompleteMultipartUploadCommand, 
  AbortMultipartUploadCommand,
  UploadPartCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AddUploadDto } from './dto/add-upload.dto';
import { PresignedUrlsDto } from './dto/presigned-urls.dto';  
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { AbortUploadDto } from './dto/abort-upload.dto';
import { Track } from '../track/track.entity';
import { User } from '../users/user.entity';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TrackCollaborator)
    private trackCollaboratorRepository: Repository<TrackCollaborator>,
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
   * 동적 청크 크기 결정
   */
  private calculateChunkSize(fileSize: number): number {
    const MB = 1024 * 1024;
    
    if (fileSize < 100 * MB) {
      return 10 * MB; // 10MB
    } else if (fileSize < 500 * MB) {
      return 25 * MB; // 25MB  
    } else {
      return 50 * MB; // 50MB
    }
  }

  /**
   * S3 객체 키 생성
   */
  private generateS3Key(userId: string, projectId: string, filename: string): string {
    // 기존 S3 Key
    const baseKey = `users/${userId}/projects/${projectId}/stems/${filename}`;

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

    // 타임스탬프가 포함된 S3 Key
    const timestampedKey = `users/${userId}/projects/${projectId}/stems/${timestamp}_${filename}`;

    // 기본적으로 baseKey를 반환하지만, 필요하다면 timestampedKey도 활용 가능
    // 예시: return { baseKey, timestampedKey };
    return baseKey;
  }

  /**
   * 프로젝트 소유권 또는 협업자 권한 검증
   */
  private async verifyProjectAccess(projectId: string, userId: string): Promise<void> {
    const track = await this.trackRepository.findOne({
      where: { id: projectId },
      relations: ['owner_id']
    });
    if (!track) throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    if (track.owner_id.id === userId) return;
    const collaborator = await this.trackCollaboratorRepository.findOne({
      where: {
        user_id: { id: userId },
        track_id: { id: projectId },
        status: 'accepted'
      }
    });
    if (!collaborator) throw new ForbiddenException('이 프로젝트에 대한 접근 권한이 없습니다.');
  } 



  /**
   * 기존 프로젝트에 파일 추가 업로드 세션 생성 (add-upload)
   */
  async addUpload(dto: AddUploadDto, userId: string) {
    try {
      const { projectId, filename, contentType, fileSize } = dto;
      
      // 1. 프로젝트 접근 권한 검증
      await this.verifyProjectAccess(projectId, userId);
      
      // 2. S3 업로드 세션 생성
      const key = this.generateS3Key(userId, projectId, filename);
      const chunkSize = this.calculateChunkSize(fileSize);

      const command = new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        Metadata: {
          userId,
          projectId,
          originalFilename: filename,
          fileSize: fileSize.toString(),
          isNewProject: 'false'
        },
      });

      const result = await this.s3.send(command);

      return {
        data: {
        uploadId: result.UploadId,
        key: result.Key,
          chunkSize,
          projectId: projectId
        }
      };
    } catch (error) {
      console.error('Add upload error:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('back-end addUpload 업로드 초기화에 실패했습니다.');
    }
  }

  /**
   * Presigned URL 발급 (청크별)
   */
  async getPresignedUrls(dto: PresignedUrlsDto, userId: string) {
    try {
      const { uploadId, key, projectId, parts } = dto;
      
      // 프로젝트 접근 권한 검증
      await this.verifyProjectAccess(projectId, userId);

      const urls = await Promise.all(
        parts.map(async (part) => {
          const command = new UploadPartCommand({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId,
            PartNumber: part.partNumber,
          });

          const url = await getSignedUrl(this.s3, command, { 
            expiresIn: 3600 // 1시간
          });

          return {
            partNumber: part.partNumber,
            url,
          };
        })
      );

      return { urls };
    } catch (error) {
      console.error('Presigned URL generation error:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Presigned URL 생성에 실패했습니다.');
    }
  }

  /*
   * 멀티파트 업로드 완료
   */
  async completeUpload(dto: CompleteUploadDto, userId: string) {
    try {
      const { uploadId, key, projectId, parts } = dto;
      
      // 프로젝트 접근 권한 검증
      await this.verifyProjectAccess(projectId, userId);

      const command = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map(part => ({
            ETag: part.eTag,
            PartNumber: part.partNumber,
          })),
        },
      });
      
      
      // 메세지 생성 완료

      const result = await this.s3.send(command);

      // 파일 메타데이터 DB에 저장
      await this.saveFileMetadata(userId, projectId, key, key.split('/').pop(), parts.length * 10 * 1024 * 1024);

      return {
        location: result.Location,
        key: result.Key,
        fileName: key.split('/').pop(),
        fileSize: parts.length * 10 * 1024 * 1024, // Mock 파일 크기
      };
    } catch (error) {
      console.error('Upload completion error:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('업로드 완료 처리에 실패했습니다.');
    }
  }

  /**
   * 업로드 취소
   */
  async abortUpload(dto: AbortUploadDto, userId: string) {
    try {
      const { uploadId, key, projectId } = dto;
      
      // 프로젝트 접근 권한 검증
      await this.verifyProjectAccess(projectId, userId);

      const command = new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
      });

      await this.s3.send(command);

      return {
        message: '업로드가 성공적으로 취소되었습니다.',
      };
    } catch (error) {
      console.error('Upload abort error:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('업로드 취소에 실패했습니다.');
    }
  }

  /**
   * 파일 메타데이터 DB 저장
   */
  private async saveFileMetadata(
    userId: string, 
    projectId: string, 
    s3Key: string, 
    filename: string, 
    fileSize: number
  ): Promise<void> {
    // TODO: StemFile 엔티티에 저장하는 로직 구현
    console.log('File metadata saved:', {
      userId,
      projectId,
      s3Key,
      filename,
      fileSize
    });
  }
}
