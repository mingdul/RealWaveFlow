import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStageDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsUUID()
    @IsNotEmpty()
    track_id: string;

    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @IsString()
    @IsOptional()
    status : string;
}