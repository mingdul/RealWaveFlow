import { Controller, Get, Post, Query, Body, Param, HttpCode, HttpStatus, Request } from '@nestjs/common';  
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ImageService } from './image.service';
import { UploadUrlDto } from './dto/upload-url.dto';

@ApiTags('images')
@Controller('images')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Get('upload-url')
  @ApiOperation({ summary: '이미지 업로드용 presigned URL 생성' })
  @ApiQuery({ name: 'trackId', description: '트랙 ID', example: 'track-123' })
  @ApiQuery({ name: 'fileName', description: '파일명', example: 'cover.jpg' })
  @ApiQuery({ name: 'contentType', description: '파일 타입', example: 'image/jpeg' })
  @ApiResponse({ 
    status: 200, 
    description: '업로드 URL 생성 성공',
    schema: {
      type: 'object',
      properties: {
        uploadUrl: { type: 'string', example: 'https://s3.amazonaws.com/...' },
        key: { type: 'string', example: 'images/track-123/1703123456789_cover.jpg' }
      }
    }
  })
  @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  async getUploadUrl(@Body() dto: UploadUrlDto, @Request() req) {
    return await this.imageService.generateUploadUrl(req.user.id, dto);
  }


  @Get(':trackId')
  @ApiOperation({ summary: '이미지 다운로드용 presigned URL 생성' })
  @ApiParam({ name: 'trackId', description: '트랙 ID', example: 'track-123' })
  @ApiResponse({ 
    status: 200, 
    description: '이미지 URL 생성 성공',
    schema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', example: 'https://s3.amazonaws.com/...' }
      }
    }
  })
  @ApiResponse({ status: 404, description: '트랙 또는 이미지를 찾을 수 없음' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  async getImageUrl(@Param('trackId') trackId: string) {
    return await this.imageService.getImageUrl(trackId);
  }
}
