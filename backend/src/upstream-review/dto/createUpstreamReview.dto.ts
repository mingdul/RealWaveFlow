import { IsNotEmpty,  IsUUID } from "class-validator";

export class CreateUpstreamReviewDto {
    @IsNotEmpty()
    @IsUUID()
    upstream_id: string;

    @IsNotEmpty()
    @IsUUID()
    stage_reviewer_id: string;
}