import { IsString, IsNumber, IsNotEmpty, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitUploadDto {
  @ApiProperty({ 
    description: '프로젝트명 (새 프로젝트 생성 시)',
    example: 'My New Track',
    required: false
  })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiProperty({ 
    description: '프로젝트 설명 (새 프로젝트 생성 시)',
    example: 'This is my new music project',
    required: false
  })
  @IsOptional()
  @IsString()
  projectDescription?: string;

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
  