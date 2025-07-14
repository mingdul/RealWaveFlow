import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadUrlDto {

  @ApiProperty({ 
    description: '파일명',
    example: 'cover.jpg'
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ 
    description: '파일 타입',
    example: 'image/jpeg'
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;
} 