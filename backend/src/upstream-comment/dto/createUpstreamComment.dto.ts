import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateUpstreamCommentDto {
    @IsString()
    @IsNotEmpty()
    comment: string;

    @IsString()
    @IsNotEmpty()
    time: string;

    @IsUUID()
    @IsNotEmpty()
    upstream_id: string;

    @IsUUID()
    @IsNotEmpty()
    user_id: string;
}