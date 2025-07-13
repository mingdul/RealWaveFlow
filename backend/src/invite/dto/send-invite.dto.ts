import { IsArray, IsEmail, IsNotEmpty, IsUUID, ArrayMinSize, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SendInviteDto {
  @IsUUID()
  @IsNotEmpty()
  trackId: string;

  @IsArray()
  @ArrayMinSize(1, { message: '최소 1개의 이메일이 필요합니다.' })
  @IsEmail({}, { each: true, message: '올바른 이메일 형식이 아닙니다.' })
  emails: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}
