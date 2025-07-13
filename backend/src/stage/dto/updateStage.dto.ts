import { IsNotEmpty, IsString } from "class-validator";

export class UpdateStageDto {
    @IsNotEmpty()
    @IsString()
    status: string;

    @IsNotEmpty()
    @IsString()
    guide_url: string;
}