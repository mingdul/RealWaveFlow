import { IsUUID, IsNotEmpty } from 'class-validator';

export class DeclineInviteDto {
  @IsUUID()
  @IsNotEmpty()
  token: string;
}
