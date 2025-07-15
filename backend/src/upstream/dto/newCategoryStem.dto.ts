import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class NewCategoryStemDto {
    @IsString()
    @IsNotEmpty()
    categoryName: string;

    @IsUUID()
    @IsNotEmpty()
    newStemId: string;

    @IsString()
    @IsNotEmpty()
    instrument : string
}