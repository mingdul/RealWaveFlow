import { IsUUID, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AcceptInviteDto {
  @IsUUID()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsString()
  user_id?: string; // 로그인된 사용자의 경우
}
