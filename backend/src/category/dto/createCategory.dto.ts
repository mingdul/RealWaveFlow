import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsUUID()
    @IsNotEmpty()
    track_id: string;

    @IsString()
    @IsNotEmpty()
    instrument: string;
}
