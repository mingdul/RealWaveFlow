import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileImageCompleteDto {
  @ApiProperty({ 
    description: 'S3 업로드 ID',
    example: 'example-upload-id'
  })
  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @ApiProperty({ 
    description: 'S3 객체 키',
    example: 'profile-images/user-123/20241215_143022_profile.jpg'
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ 
    description: 'ETag 값',
    example: 'example-etag-value'
  })
  @IsString()
  @IsNotEmpty()
  eTag: string;
}