import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileImageUploadDto {
  @ApiProperty({ 
    description: '파일명',
    example: 'profile.jpg'
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ 
    description: 'MIME 타입',
    example: 'image/jpeg'
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({ 
    description: '파일 크기 (bytes)',
    example: 2048000,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  fileSize: number;
}