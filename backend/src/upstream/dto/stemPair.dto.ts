import { IsOptional, IsString } from "class-validator";


export class StemPairDto {
    @IsOptional()
    @IsString()
    oldStem?: string;

    @IsOptional()
    @IsString()
    newStem?: string;
}