import { BadRequestException, Injectable } from '@nestjs/common';
import { UpstreamComment } from './upstream-comment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUpstreamCommentDto } from './dto/createUpstreamComment.dto';

@Injectable()
export class UpstreamCommentService {
    constructor(
        @InjectRepository(UpstreamComment)
        private upstreamCommentRepository: Repository<UpstreamComment>,
    ) {}

    async createUpstreamComment(createUpstreamCommentDto: CreateUpstreamCommentDto) {
        const { upstream_id, user_id, comment, time } = createUpstreamCommentDto;
        const upstreamComment = this.upstreamCommentRepository.create({
            upstream: { id: upstream_id },
            user: { id: user_id },
            comment,
            time,
        });

        const savedUpstreamComment = await this.upstreamCommentRepository.save(upstreamComment);
        if (!savedUpstreamComment) {
            throw new BadRequestException('Failed to create upstream comment');
        }
        return {
            success: true,
            message: 'Upstream comment created successfully',
            upstream_comment: savedUpstreamComment,
        };
    }
}
