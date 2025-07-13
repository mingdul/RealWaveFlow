import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTrackCollaboratorDto {
    @ApiProperty({ description: '상태 (pending, accepted, rejected)', required: false })
    @IsOptional()
    @IsString()
    status?: string;
} 