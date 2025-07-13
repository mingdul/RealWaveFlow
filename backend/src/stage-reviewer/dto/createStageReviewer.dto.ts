import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateStageReviewerDto {

    @IsUUID()
    @IsNotEmpty()
    stage_id: string;

    @IsUUID()
    @IsNotEmpty()
    user_id: string;
}