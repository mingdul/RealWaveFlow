import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SetRoleDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsUUID()
  trackId: string;

  @IsNotEmpty()
  @IsString()
  role: string;
}