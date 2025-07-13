import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: '비밀번호를 찾을 이메일',
  })
  @IsEmail()
  email: string;
}