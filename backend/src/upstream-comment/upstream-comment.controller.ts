import { Body, Controller, Post } from '@nestjs/common';
import { UpstreamCommentService } from './upstream-comment.service';
import { CreateUpstreamCommentDto } from './dto/createUpstreamComment.dto';

@Controller('upstream-comment')
export class UpstreamCommentController {
  constructor(private readonly upstreamCommentService: UpstreamCommentService) {}

  @Post('create')
  async createUpstreamComment(@Body() createUpstreamCommentDto: CreateUpstreamCommentDto) {
    return this.upstreamCommentService.createUpstreamComment(createUpstreamCommentDto);
  }
}
