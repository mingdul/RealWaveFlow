import { Controller, Post, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { AddUploadDto } from './dto/add-upload.dto';
import { PresignedUrlsDto } from './dto/presigned-urls.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { AbortUploadDto } from './dto/abort-upload.dto';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('add-upload')
  @ApiOperation({ 
    summary: '기존 프로젝트에 파일 추가 업로드 세션 생성',
    description: '기존 프로젝트에 파일을 추가하는 업로드 세션을 시작합니다. 프로젝트 소유권 또는 협업자 권한을 체크합니다.'
  })
  @ApiResponse({ 
    status: 201, 
    description: '업로드 세션 생성 성공',
    schema: {
      example: {
        success: true,
        data: {
          uploadId: "example-upload-id",
          key: "users/123/projects/456/stems/snare.wav",
          chunkSize: 10485760,
          projectId: "456"
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '프로젝트 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '프로젝트를 찾을 수 없음' })
  async addUpload(@Body() dto: AddUploadDto, @Request() req) {
    const userId = req.user.id;
    const data = await this.uploadService.addUpload(dto, userId);
    return {success: true, data: data.data};
  }

  @Post('presigned-urls')
  @ApiOperation({ 
    summary: 'Presigned URL 발급',
    description: '특정 파일의 청크(part)마다 S3 업로드용 Presigned URL을 반환합니다.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Presigned URL 발급 성공',
    schema: {
      example: {
        success: true,
        data: {
          urls: [
            {
              partNumber: 1,
              url: "https://s3.amazonaws.com/bucket/key?presigned-params"
            }
          ]
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '프로젝트 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '프로젝트를 찾을 수 없음' })
  async getPresignedUrls(@Body() dto: PresignedUrlsDto, @Request() req) {
    const userId = req.user.id;
    const data = await this.uploadService.getPresignedUrls(dto, userId);
    return {
      success: true,
      data: data
    };
  }

  @Post('complete')
  @ApiOperation({ 
    summary: '업로드 완료',
    description: '모든 청크 업로드 완료 후 S3에 결합 요청을 보내고 파일 메타데이터를 DB에 저장합니다.'
  })
  @ApiResponse({ 
    status: 201, 
    description: '업로드 완료 성공',
    schema: {
      example: {
        success: true,
        data: {
          location: "https://s3.amazonaws.com/bucket/key",
          key: "users/123/projects/456/stems/kick.wav",
          fileName: "kick.wav",
          fileSize: 1024000
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '프로젝트 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '프로젝트를 찾을 수 없음' })
  completeUpload(@Body() dto: CompleteUploadDto, @Request() req) {
    const userId = req.user.id;
    return this.uploadService.completeUpload(dto, userId).then(data => ({
      success: true,
      data: data
    }));
  }

  @Post('abort')
  @ApiOperation({ 
    summary: '업로드 취소',
    description: '업로드 도중 사용자가 취소 시, S3에서 멀티파트 업로드 세션을 종료하고 중간 청크를 삭제합니다.'
  })
  @ApiResponse({ 
    status: 201, 
    description: '업로드 취소 성공',
    schema: {
      example: {
        success: true,
        message: "업로드가 성공적으로 취소되었습니다."
      }
    }
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '프로젝트 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '프로젝트를 찾을 수 없음' })
  abortUpload(@Body() dto: AbortUploadDto, @Request() req) {
    const userId = req.user.id;
    return this.uploadService.abortUpload(dto, userId).then(data => ({
      success: true,
      message: "업로드가 성공적으로 취소되었습니다."
    }));
  }
}
