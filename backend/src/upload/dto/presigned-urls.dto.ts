import { IsString, IsArray, IsNotEmpty, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PartDto {
  @ApiProperty({ 
    description: '청크 번호 (1부터 시작)',
    example: 1,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  partNumber: number;
}

export class PresignedUrlsDto {
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

  @ApiProperty({ 
    description: 'Presigned URL을 요청할 청크 목록',
    type: [PartDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartDto)
  parts: PartDto[];
} 