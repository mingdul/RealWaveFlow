import { IsString, IsNumber, IsNotEmpty, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddUploadDto {
  @ApiProperty({ 
    description: '프로젝트 ID (기존 프로젝트)',
    example: '123'
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ 
    description: '파일명',
    example: 'kick.wav'
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ 
    description: 'MIME 타입',
    example: 'audio/wav'
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({ 
    description: '파일 크기 (bytes)',
    example: 1024000,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  fileSize: number;
} 