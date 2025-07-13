import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTrackCollaboratorDto {
    @ApiProperty({ description: '트랙 ID' })
    @IsString()
    track_id: string;

    @ApiProperty({ description: '사용자 ID' })
    @IsString()
    user_id: string;

    @ApiProperty({ description: '상태 (pending, accepted)', default: 'pending' })
    @IsOptional()
    @IsString()
    status?: string;
} 