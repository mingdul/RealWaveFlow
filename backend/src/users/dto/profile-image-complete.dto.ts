import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileImageCompleteDto {
  @ApiProperty({ 
    description: 'S3 객체 키',
    example: 'profile-images/user-123/20241215_143022_profile.jpg'
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ 
    description: 'S3 업로드 ID (Simple upload에서는 선택사항)',
    example: 'simple-upload',
    required: false
  })
  @IsString()
  @IsOptional()
  uploadId?: string;

  @ApiProperty({ 
    description: 'ETag 값 (Simple upload에서는 선택사항)',
    example: '"completed"',
    required: false
  })
  @IsString()
  @IsOptional()
  eTag?: string;
}