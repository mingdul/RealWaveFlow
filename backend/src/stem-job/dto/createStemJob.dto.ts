import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateStemJobDto {

    @IsString()
    @IsNotEmpty()
    file_name: string;

    @IsString()
    @IsNotEmpty()
    file_path: string;

    @IsString()
    @IsOptional()
    stem_hash?: string;

    @IsString()
    @IsOptional()
    key?: string;

    @IsString()
    @IsOptional()
    bpm?: string;

    @IsUUID()
    @IsOptional()
    upstream_id?: string;

    @IsUUID()
    @IsNotEmpty()
    stage_id: string;

    @IsUUID()
    @IsNotEmpty()
    track_id: string;
}