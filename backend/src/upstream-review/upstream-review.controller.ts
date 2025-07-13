import { Body, Controller, Post } from '@nestjs/common';
import { UpstreamReviewService } from './upstream-review.service';
import { CreateUpstreamReviewDto } from './dto/createUpstreamReview.dto';

@Controller('upstream-review')
export class UpstreamReviewController {
  constructor(private readonly upstreamReviewService: UpstreamReviewService) {}

  @Post('create')
  async createUpstreamReview(@Body() createUpstreamReviewDto: CreateUpstreamReviewDto) {
    return this.upstreamReviewService.createUpstreamReview(createUpstreamReviewDto);
  }
}
