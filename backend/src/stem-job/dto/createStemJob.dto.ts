import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateStemJobDto {

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
}