import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTrackDto {
    @ApiProperty({ description: '트랙 이름', required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;


    @ApiProperty({ description: '트랙 장르', required: false })
    @IsOptional()
    @IsString()
    genre?: string;

    @ApiProperty({ description: '트랙 BPM', required: false })
    @IsOptional()
    @IsString()     
    bpm?: string;

    @ApiProperty({ description: '트랙 키 시그니처', required: false })
    @IsOptional()
    @IsString()
    key_signature?: string;

    @ApiProperty({ description: '트랙 설명', required: false })
    @IsOptional()
    @IsString()
    description?: string;
} 