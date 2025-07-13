import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { UpstreamCommentService } from './upstream-comment.service';
import { CreateUpstreamCommentDto } from './dto/createUpstreamComment.dto';
import { UpdateUpstreamCommentDto } from './dto/updateUpstreamComment.dto';

@Controller('upstream-comment')
export class UpstreamCommentController {
  constructor(private readonly upstreamCommentService: UpstreamCommentService) {}

  @Post('create')
  async createUpstreamComment(@Body() createUpstreamCommentDto: CreateUpstreamCommentDto) {
    return this.upstreamCommentService.createUpstreamComment(createUpstreamCommentDto);
  }


  @Get('/upstream/:upstream_id')
  async getUpstreamComments(@Param('upstream_id') upstream_id: string) {
    return this.upstreamCommentService.getUpstreamComments(upstream_id);
  }

  @Delete('/delete/:upstream_comment_id')
  async deleteUpstreamComment(@Param('upstream_comment_id') upstream_comment_id: string) {
    return this.upstreamCommentService.deleteUpstreamComment(upstream_comment_id);
  }

  @Put('/update/:upstream_comment_id')
  async updateUpstreamComment(@Param('upstream_comment_id') upstream_comment_id: string, @Body() updateUpstreamCommentDto: UpdateUpstreamCommentDto) {
    return this.upstreamCommentService.updateUpstreamComment(upstream_comment_id, updateUpstreamCommentDto);
  }
}
