import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UpstreamCommentService } from './upstream-comment.service';
import { CreateUpstreamCommentDto } from './dto/createUpstreamComment.dto';
import { UpdateUpstreamCommentDto } from './dto/updateUpstreamComment.dto';

@ApiTags('upstream-comment')
@Controller('upstream-comment')
export class UpstreamCommentController {
  constructor(private readonly upstreamCommentService: UpstreamCommentService) {}

  @Post('create')
  @ApiOperation({ summary: '업스트림 댓글 생성', description: '새로운 업스트림 댓글을 생성합니다.' })
  @ApiBody({ type: CreateUpstreamCommentDto })
  @ApiResponse({ status: 201, description: '업스트림 댓글 생성 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async createUpstreamComment(@Body() createUpstreamCommentDto: CreateUpstreamCommentDto) {
    return this.upstreamCommentService.createUpstreamComment(createUpstreamCommentDto);
  }

  @Get('/upstream/:upstream_id')
  @ApiOperation({ summary: '업스트림 댓글 조회', description: '특정 업스트림의 댓글들을 조회합니다.' })
  @ApiParam({ name: 'upstream_id', description: '업스트림 ID' })
  @ApiResponse({ status: 200, description: '업스트림 댓글 조회 성공' })
  @ApiResponse({ status: 404, description: '업스트림을 찾을 수 없음' })
  async getUpstreamComments(@Param('upstream_id') upstream_id: string) {
    return this.upstreamCommentService.getUpstreamComments(upstream_id);
  }

  @Delete('/delete/:upstream_comment_id')
  @ApiOperation({ summary: '업스트림 댓글 삭제', description: '업스트림 댓글을 삭제합니다.' })
  @ApiParam({ name: 'upstream_comment_id', description: '업스트림 댓글 ID' })
  @ApiResponse({ status: 200, description: '업스트림 댓글 삭제 성공' })
  @ApiResponse({ status: 404, description: '업스트림 댓글을 찾을 수 없음' })
  async deleteUpstreamComment(@Param('upstream_comment_id') upstream_comment_id: string) {
    return this.upstreamCommentService.deleteUpstreamComment(upstream_comment_id);
  }

  @Put('/update/:upstream_comment_id')
  @ApiOperation({ summary: '업스트림 댓글 수정', description: '업스트림 댓글을 수정합니다.' })
  @ApiParam({ name: 'upstream_comment_id', description: '업스트림 댓글 ID' })
  @ApiBody({ type: UpdateUpstreamCommentDto })
  @ApiResponse({ status: 200, description: '업스트림 댓글 수정 성공' })
  @ApiResponse({ status: 404, description: '업스트림 댓글을 찾을 수 없음' })
  async updateUpstreamComment(@Param('upstream_comment_id') upstream_comment_id: string, @Body() updateUpstreamCommentDto: UpdateUpstreamCommentDto) {
    return this.upstreamCommentService.updateUpstreamComment(upstream_comment_id, updateUpstreamCommentDto);
  }
}
