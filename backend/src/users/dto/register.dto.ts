import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: '사용자 이메일',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '홍길동',
    description: '사용자명',
  })
  @IsString()
  username: string;

  @ApiProperty({
    example: 'password123',
    description: '비밀번호 (최소 6자)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}