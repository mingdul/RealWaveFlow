import { Controller } from '@nestjs/common';
import { UpstreamCommentService } from './upstream-comment.service';

@Controller('upstream-comment')
export class UpstreamCommentController {
  constructor(private readonly upstreamCommentService: UpstreamCommentService) {}
}
