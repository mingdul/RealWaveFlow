import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UpstreamReviewService } from './upstream-review.service';
import { CreateUpstreamReviewDto } from './dto/createUpstreamReview.dto';

@ApiTags('upstream-review')
@Controller('upstream-review')
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
}
