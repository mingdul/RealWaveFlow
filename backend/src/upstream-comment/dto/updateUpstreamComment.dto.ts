import { IsNotEmpty, IsString } from "class-validator";

export class UpdateUpstreamCommentDto {
    @IsString()
    @IsNotEmpty()
    comment: string;

    @IsString()
    @IsNotEmpty()
    time: string;
}