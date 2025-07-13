import { IsNotEmpty, IsString, IsNumber, IsUUID } from 'class-validator';

export class CreateStageDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsNotEmpty()
    version: number;

    @IsUUID()
    @IsNotEmpty()
    track_id: string;

    @IsUUID()
    @IsNotEmpty()
    user_id: string;
}