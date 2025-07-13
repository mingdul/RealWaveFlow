import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStemDto {
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
    upstream_id: string;


}