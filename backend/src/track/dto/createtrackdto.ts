import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateTrackDto {
    
    @ApiProperty({
        description: '트랙 이름',
        example: 'My Awesome Track',
        minLength: 1,
        maxLength: 100
    })
    @IsString()
    title: string;

    @ApiPropertyOptional({
        description: '트랙 이미지 URL (선택사항)',
        example: 'https://example.com/image.jpg',
        maxLength: 255
    })
    @IsOptional()
    @IsString()
    image_url: string;

    @ApiPropertyOptional({
        description: '트랙 장르 (선택사항)',
        example: 'Hip-Hop',
        maxLength: 100
    })
    @IsOptional()
    @IsString()
    genre: string;

    @ApiPropertyOptional({
        description: '트랙 BPM (선택사항)',
        example: '120',
        maxLength: 10
    })
    @IsOptional()
    @IsString()
    bpm: string;

    @ApiPropertyOptional({
        description: '트랙 키 시그니처 (선택사항)',
        example: 'C',
        maxLength: 10
    })
    @IsOptional()
    @IsString()
    key_signature: string;

    @ApiPropertyOptional({
        description: '트랙 설명 (선택사항)',
        example: '새로운 힙합 트랙입니다. 강렬한 베이스라인과 트랩 비트가 특징입니다.',
        maxLength: 500
    })
    @IsOptional()   
    @IsString()
    description: string;
}