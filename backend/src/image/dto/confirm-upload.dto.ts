import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmUploadDto {
  @ApiProperty({ 
    description: '트랙 ID',
    example: 'track-123'
  })
  @IsString()
  @IsNotEmpty()
  trackId: string;

  @ApiProperty({ 
    description: 'S3 객체 키',
    example: 'images/track-123/1703123456789_cover.jpg'
  })
  @IsString()
  @IsNotEmpty()
  key: string;
} 