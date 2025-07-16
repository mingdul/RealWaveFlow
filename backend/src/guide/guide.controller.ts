import { Controller, Get, Param, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { GuideService } from './guide.service';
import { Stem } from 'src/stem/stem.entity';

@ApiTags('guides')
@Controller('guide')
export class GuideController {
    private readonly logger = new Logger(GuideController.name);

    constructor(private readonly guideService: GuideService) {}

    @Get('track/:trackId/version-stem/:version')
    @ApiOperation({ 
        summary: '특정 트랙의 버전에 해당하는 가이드의 스템들 조회',
        description: '트랙 ID와 버전을 받아서 해당 스테이지의 가이드에 포함된 모든 스템들을 반환합니다.'
    })
    @ApiParam({ 
        name: 'trackId', 
        description: '트랙 ID',
        type: 'string',
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    })
    @ApiParam({ 
        name: 'version', 
        description: '스테이지 버전',
        type: 'number',
        example: 1
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: '스템 목록 조회 성공',
        type: [Stem]
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: '해당 트랙과 버전에 맞는 스테이지 또는 가이드를 찾을 수 없음'
    })
    @ApiResponse({ 
        status: HttpStatus.BAD_REQUEST, 
        description: '잘못된 요청 매개변수'
    })
    async getStemsByTrackAndVersion(
        @Param('trackId') trackId: string,
        @Param('version') version: string
    ): Promise<{
        success: boolean;
        data: Stem[];
        message: string;
    }> {
        this.logger.log(`GET /guide/track/${trackId}/version-stem/${version}`);

        try {
            const versionNumber = parseInt(version, 10);
            
            if (isNaN(versionNumber) || versionNumber < 1) {
                return {
                    success: false,
                    data: [],
                    message: 'Version must be a valid positive number'
                };
            }

            const stems = await this.guideService.getStemsByTrackAndVersion(
                trackId, 
                versionNumber
            );

            this.logger.log(`Successfully retrieved ${stems.length} stems for track ${trackId} version ${versionNumber}`);

            return {
                success: true,
                data: stems,
                message: `Successfully retrieved ${stems.length} stems`
            };

        } catch (error) {
            this.logger.error(`Failed to get stems for track ${trackId} version ${version}:`, error.message);
            
            return {
                success: false,
                data: [],
                message: error.message || 'Failed to retrieve stems'
            };
        }
    }
} 