import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UpstreamReviewService } from './upstream-review.service';
import { CreateUpstreamReviewDto } from './dto/createUpstreamReview.dto'; 
import { AuthGuard } from '@nestjs/passport';
import { UseGuards } from '@nestjs/common';

@ApiTags('upstream-review')
@Controller('upstream-review')
@UseGuards(AuthGuard('jwt'))
export class UpstreamReviewController {
  constructor(private readonly upstreamReviewService: UpstreamReviewService) {}

  @Post('create')
  @ApiOperation({ summary: '업스트림 리뷰 생성', description: '새로운 업스트림 리뷰를 생성합니다.' })
  @ApiBody({ type: CreateUpstreamReviewDto })
  @ApiResponse({ status: 201, description: '업스트림 리뷰 생성 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async createUpstreamReview(@Body() createUpstreamReviewDto: CreateUpstreamReviewDto) {
    return this.upstreamReviewService.createUpstreamReview(createUpstreamReviewDto);
  }

  @Get('/:upstream_id')
  @ApiOperation({ summary: '업스트림 리뷰 조회', description: '특정 업스트림의 모든 리뷰 상태를 조회합니다.' })
  @ApiResponse({ status: 200, description: '업스트림 리뷰 조회 성공' })
  @ApiResponse({ status: 404, description: '업스트림 리뷰를 찾을 수 없음' })
  async getUpstreamReviews(@Param('upstream_id') upstream_id: string) {
    return this.upstreamReviewService.getUpstreamReviewsWithReviewers(upstream_id);
  }


  @Put('approve-drop-reviewer/:stageId/:upstreamId/')
  @ApiOperation({ summary: '업스트림 리뷰 승인', description: '업스트림 리뷰를 승인합니다.' })
  @ApiResponse({ status: 200, description: '업스트림 리뷰 승인 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async approveDropReviewer(@Param('stageId') stageId: string, @Param('upstreamId') upstreamId: string, @Req() req) {
    return this.upstreamReviewService.approveDropReviewer(stageId, upstreamId, req.user.id);
  }

  @Put('reject-drop-reviewer/:stageId/:upstreamId/')
  @ApiOperation({ summary: '업스트림 리뷰 거절', description: '업스트림 리뷰를 거절합니다.' })
  @ApiResponse({ status: 200, description: '업스트림 리뷰 거절 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async rejectDropReviewer(@Param('stageId') stageId: string, @Param('upstreamId') upstreamId: string, @Req() req) {
    return this.upstreamReviewService.rejectDropReviewer(stageId, upstreamId, req.user.id);
  }
}
