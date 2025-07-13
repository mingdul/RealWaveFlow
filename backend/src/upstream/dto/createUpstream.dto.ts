import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUpstreamDto {
    @IsString()
    @IsNotEmpty()
    title: string;

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