import { IsString, IsOptional, IsUrl, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    example: '홍길동',
    description: '사용자명 (2-20자)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 20, { message: '사용자명은 2자 이상 20자 이하로 입력해주세요.' })
  username?: string;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/bucket/profile-images/user123.jpg',
    description: '프로필 이미지 URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  image_url?: string;
}