import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

export class CheckEmailDto {
  @IsUUID()
  @IsNotEmpty()
  track_id: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
