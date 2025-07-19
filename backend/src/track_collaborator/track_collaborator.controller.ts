import { Controller, UseGuards, Post, Get, Put, Delete, Body, Param, ValidationPipe, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { TrackCollaboratorService } from './track_collaborator.service';
import { CreateTrackCollaboratorDto } from './dto/create-track-collaborator.dto';
import { UpdateTrackCollaboratorDto } from './dto/update-track-collaborator.dto';

@ApiTags('Track Collaborator')
@Controller('track-collaborator')
@UseGuards(AuthGuard('jwt'))
export class TrackCollaboratorController {
    constructor(private readonly trackCollaboratorService: TrackCollaboratorService) {}

    @Post('create')
    @ApiOperation({ summary: '협업자 추가', description: '트랙에 새로운 협업자를 추가합니다.' })
    @ApiBody({ type: CreateTrackCollaboratorDto })
    @ApiResponse({ status: 201, description: '협업자 추가 성공' })
    @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
    @ApiResponse({ status: 409, description: '이미 존재하는 협업자 관계' })
    async createCollaborator(@Body(ValidationPipe) createTrackCollaboratorDto: CreateTrackCollaboratorDto) {
        return this.trackCollaboratorService.createCollaborator(createTrackCollaboratorDto);
    }


    @Get('track/:trackId')
    @ApiOperation({ summary: '트랙별 협업자 조회', description: '특정 트랙의 협업자들을 조회합니다.' })
    @ApiParam({ name: 'trackId', description: '트랙 ID' })
    @ApiResponse({ status: 200, description: '트랙별 협업자 조회 성공' })
    async getCollaboratorsByTrack(@Param('trackId') trackId: string) {
        return this.trackCollaboratorService.findCollaboratorsByTrack(trackId);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: '사용자별 협업자 조회', description: '특정 사용자의 협업 관계들을 조회합니다.' })
    @ApiParam({ name: 'userId', description: '사용자 ID' })
    @ApiResponse({ status: 200, description: '사용자별 협업자 조회 성공' })
    async getCollaboratorsByUser(@Param('userId') userId: string) {
        return this.trackCollaboratorService.findCollaboratorsByUser(userId);
    }

    @Get('my-collaborations')
    @ApiOperation({ summary: '내 협업 관계 조회', description: '현재 사용자의 협업 관계들을 조회합니다.' })
    @ApiResponse({ status: 200, description: '내 협업 관계 조회 성공' })
    async getMyCollaborations(@Request() req) {
        return this.trackCollaboratorService.findCollaboratorsByUser(req.user.id);
    }


    @Put(':id')
    @ApiOperation({ summary: '협업자 상태 수정', description: '협업자 관계의 상태를 수정합니다.' })
    @ApiParam({ name: 'id', description: '협업자 관계 ID' })
    @ApiBody({ type: UpdateTrackCollaboratorDto })
    @ApiResponse({ status: 200, description: '협업자 수정 성공' })
    @ApiResponse({ status: 404, description: '협업자를 찾을 수 없음' })
    async updateCollaborator(
        @Param('id') id: string,
        @Body(ValidationPipe) updateTrackCollaboratorDto: UpdateTrackCollaboratorDto
    ) {
        return this.trackCollaboratorService.updateCollaborator(id, updateTrackCollaboratorDto);
    }

    @Put(':id/accept')
    @ApiOperation({ summary: '협업 수락', description: '협업 요청을 수락합니다.' })
    @ApiParam({ name: 'id', description: '협업자 관계 ID' })
    @ApiResponse({ status: 200, description: '협업 수락 성공' })
    @ApiResponse({ status: 404, description: '협업자를 찾을 수 없음' })
    async acceptCollaboration(@Param('id') id: string) {
        return this.trackCollaboratorService.acceptCollaboration(id);
    }

    @Put(':id/reject')
    @ApiOperation({ summary: '협업 거절', description: '협업 요청을 거절합니다.' })
    @ApiParam({ name: 'id', description: '협업자 관계 ID' })
    @ApiResponse({ status: 200, description: '협업 거절 성공' })
    @ApiResponse({ status: 404, description: '협업자를 찾을 수 없음' })
    async rejectCollaboration(@Param('id') id: string) {
        return this.trackCollaboratorService.rejectCollaboration(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: '협업자 제거', description: '협업자 관계를 삭제합니다.' })
    @ApiParam({ name: 'id', description: '협업자 관계 ID' })
    @ApiResponse({ status: 200, description: '협업자 제거 성공' })
    @ApiResponse({ status: 404, description: '협업자를 찾을 수 없음' })
    async deleteCollaborator(@Param('id') id: string) {
        return this.trackCollaboratorService.deleteCollaborator(id);
    }

    @Get('track-users/:trackId')
    @ApiOperation({ 
        summary: '트랙 소유자 및 협업자 조회', 
        description: '특정 트랙의 소유자와 협업자들을 조회합니다. accepted 상태의 협업자만 반환됩니다.' 
    })
    @ApiParam({ name: 'trackId', description: '트랙 ID' })
    @ApiResponse({ 
        status: 200, 
        description: '트랙 사용자 조회 성공',
        schema: {
            example: {
                success: true,
                data: {
                    owner: {
                        id: "user-id",
                        email: "owner@example.com",
                        username: "owner_username",
                        image_url: "profile/image/url"
                    },
                    collaborators: {
                        collaborator: [
                            {
                                id: "user-id-1",
                                email: "collab1@example.com", 
                                username: "collaborator1",
                                image_url: "profile/image/url"
                            },
                            {
                                id: "user-id-2",
                                email: "collab2@example.com",
                                username: "collaborator2", 
                                image_url: "profile/image/url"
                            }
                        ]
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
    async getTrackUsers(@Param('trackId') trackId: string) {
        return this.trackCollaboratorService.findTrackUsersById(trackId);
    }
}
