import { Body, Controller, Post, Get, Put, Delete, Param, UseGuards, ValidationPipe, Request } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateTrackDto } from './dto/createtrackdto';
import { UpdateTrackDto } from './dto/updatetrackdto';
import { TrackService } from './track.service';
import { AuthGuard } from '@nestjs/passport';
import { SkipTrackAccess } from 'src/auth/decorators/skip-track-access.decorator';

@ApiTags('Track')
@Controller('tracks')
@UseGuards(AuthGuard('jwt'))
@SkipTrackAccess()
export class TrackController {
    constructor(private readonly trackService : TrackService){}

    @Post()
    @ApiOperation({ 
      summary: '트랙 생성', 
      description: '새로운 음악 트랙을 생성합니다. 생성된 트랙은 Git Repository와 유사한 역할을 합니다.' 
    })
    @ApiBody({ type: CreateTrackDto })
    @ApiResponse({ status: 201, description: '트랙 생성 성공' })
    @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
    async createTrack(@Body(ValidationPipe) createTrackDto: CreateTrackDto, @Request() req) {
        
        return this.trackService.createTrack(createTrackDto, req.user.id);
    }

    @Put('/status/:trackId/:status')
    @ApiOperation({ summary: '트랙 상태 업데이트', description: '트랙 상태를 업데이트합니다.' })
    @ApiParam({ name: 'trackId', description: '트랙 ID' })
    @ApiParam({ name: 'status', description: '트랙 상태' })
    @ApiResponse({ status: 200, description: '트랙 상태 업데이트 성공' })
    @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
    @ApiResponse({ status: 400, description: '트랙 상태 업데이트 실패' })
    async updateTrackStatus(@Param('trackId') trackId: string, @Param('status') status: string) {
        return this.trackService.updateTrackStatus(trackId, status);
    }



    @Get()
    @ApiOperation({ summary: '내 트랙 조회', description: '현재 사용자가 소유한 트랙들을 조회합니다.' })
    @ApiResponse({ status: 200, description: '내 트랙 목록 조회 성공' })
    async getMyTracks(@Request() req) {
        console.log('[DEBUG] getMyTracks req.user:', req.user);
        return this.trackService.findTracksByOwner(req.user.id);
    }

    @Get('collaborator')
    @ApiOperation({ summary: '협업 트랙 조회', description: '현재 사용자가 협업자로 포함된 트랙들을 조회합니다.' })
    @ApiResponse({ status: 200, description: '협업 트랙 목록 조회 성공' })
    async getCollaboratorTracks(@Request() req) {
        return this.trackService.findTracksByCollaborator(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: '트랙 상세 조회', description: '특정 트랙의 상세 정보를 조회합니다.' })
    @ApiParam({ name: 'id', description: '트랙 ID' })
    @ApiResponse({ status: 200, description: '트랙 상세 조회 성공' })
    @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
    async getTrackById(@Param('id') id: string) {
        const {track} = await this.trackService.findTrackById(id);
        return {
            success: true,
            data: track
        }
    }

    @Put(':id')
    @ApiOperation({ summary: '트랙 수정', description: '트랙 정보를 수정합니다.' })
    @ApiParam({ name: 'id', description: '트랙 ID' })
    @ApiBody({ type: UpdateTrackDto })
    @ApiResponse({ status: 200, description: '트랙 수정 성공' })
    @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
    @ApiResponse({ status: 403, description: '권한 없음' })
    async updateTrack(
        @Param('id') id: string,
        @Body(ValidationPipe) updateTrackDto: UpdateTrackDto,
        @Request() req
    ) {
        return this.trackService.updateTrack(id, updateTrackDto, req.user.id);
    }

    @Get(':id/collaborators')
    @ApiOperation({ summary: '트랙 협업자 조회', description: '특정 트랙의 협업자들을 조회합니다.' })
    @ApiParam({ name: 'id', description: '트랙 ID' })
    @ApiResponse({ status: 200, description: '트랙 협업자 조회 성공' })
    @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
    async getTrackCollaborators(@Param('id') id: string) {
        return this.trackService.getTrackCollaborators(id);
    }

    @Get(':id/check-access')
    @ApiOperation({ summary: '트랙 접근 권한 확인', description: '현재 사용자가 해당 트랙의 멤버인지 확인합니다.' })
    @ApiParam({ name: 'id', description: '트랙 ID' })
    @ApiResponse({ status: 200, description: '접근 권한 확인 성공' })
    @ApiResponse({ status: 403, description: '접근 권한 없음' })
    async checkTrackAccess(@Param('id') id: string, @Request() req) {
        const hasAccess = await this.trackService.isUserInTrack(req.user.id, id);
        return {
            success: true,
            hasAccess,
            trackId: id
        };
    }

    @Delete(':id')
    @ApiOperation({ summary: '트랙 삭제', description: '트랙을 삭제합니다.' })
    @ApiParam({ name: 'id', description: '트랙 ID' })
    @ApiResponse({ status: 200, description: '트랙 삭제 성공' })
    @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
    @ApiResponse({ status: 403, description: '권한 없음' })
    async deleteTrack(@Param('id') id: string, @Request() req) {
        return this.trackService.deleteTrack(id, req.user.id);
    }
}
