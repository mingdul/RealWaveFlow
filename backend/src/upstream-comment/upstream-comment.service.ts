import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpstreamComment } from './upstream-comment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUpstreamCommentDto } from './dto/createUpstreamComment.dto';
import { UpdateUpstreamCommentDto } from './dto/updateUpstreamComment.dto';

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


    async getUpstreamComments(upstream_id: string) {
        const upstreamComments = await this.upstreamCommentRepository.find({
            where: { upstream: { id: upstream_id } },
            relations: ['upstream', 'user'],
        });

        if (upstreamComments.length === 0) {
            throw new NotFoundException('No upstream comments found');
        }
        return {
            success: true,
            message: 'Upstream comments fetched successfully',
            upstreamComments,
        };
    }


    async deleteUpstreamComment(upstream_comment_id: string) {
        const upstreamComment = await this.upstreamCommentRepository.findOne({
            where: { id: upstream_comment_id },
        });

        if (!upstreamComment) {
            throw new NotFoundException('Upstream comment not found');
        }
        await this.upstreamCommentRepository.delete(upstream_comment_id);
        return {
            success: true,
            message: 'Upstream comment deleted successfully',
            upstream_comment: upstreamComment,
        };
    }
    
    async updateUpstreamComment(upstream_comment_id: string, updateUpstreamCommentDto: UpdateUpstreamCommentDto) {
        const { comment, time } = updateUpstreamCommentDto;
        const upstreamComment = await this.upstreamCommentRepository.findOne({
            where: { id: upstream_comment_id },
        });

        if (!upstreamComment) {
            throw new NotFoundException('Upstream comment not found');
        }
        await this.upstreamCommentRepository.update(upstream_comment_id, { comment, time });
        return {
            success: true,
            message: 'Upstream comment updated successfully',
            upstream_comment: upstreamComment,
        };
    }
}
