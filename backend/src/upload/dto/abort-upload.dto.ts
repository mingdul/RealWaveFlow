import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AbortUploadDto {
  @ApiProperty({ 
    description: 'S3 업로드 ID',
    example: 'example-upload-id'
  })
  @IsString()
  @IsNotEmpty()
  uploadId: string; 

  @ApiProperty({ 
    description: 'S3 객체 키',
    example: 'users/123/projects/456/stems/kick.wav'
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ 
    description: '프로젝트 ID',
    example: 'project-123'
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;
} 