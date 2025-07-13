import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber } from 'class-validator';

export class CreateVersionStemDto {
    @IsString()
    @IsNotEmpty()
    file_name: string;

    @IsString()
    @IsNotEmpty()
    stem_hash: string;

    @IsString()
    @IsNotEmpty()
    file_path: string;

    @IsString()
    @IsOptional()
    key: string;

    @IsString()
    @IsOptional()
    bpm: string;

    @IsUUID()
    @IsNotEmpty()
    category_id: string;

    @IsUUID()
    @IsNotEmpty()
    stage_id: string;

    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @IsNumber()
    @IsNotEmpty()
    version: number;
}