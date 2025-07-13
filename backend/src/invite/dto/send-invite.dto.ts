import { IsArray, IsEmail, IsNotEmpty, IsUUID, ArrayMinSize } from 'class-validator';

export class SendInviteDto {
  @IsUUID()
  @IsNotEmpty()
  track_id: string;

  @IsArray()
  @ArrayMinSize(1, { message: '최소 1개의 이메일이 필요합니다.' })
  @IsEmail({}, { each: true, message: '올바른 이메일 형식이 아닙니다.' })
  emails: string[];
}
