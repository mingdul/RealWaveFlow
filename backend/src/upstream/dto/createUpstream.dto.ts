import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUpstreamDto {

    @IsString()
    @IsOptional()
    description: string;

    @IsUUID()
    @IsNotEmpty()
    stage_id: string;

    @IsUUID()
    @IsNotEmpty()
    user_id: string;
}