import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { UpstreamComment } from './upstream-comment.entity';
import { Upstream } from '../upstream/upstream.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUpstreamCommentDto } from './dto/createUpstreamComment.dto';
import { UpdateUpstreamCommentDto } from './dto/updateUpstreamComment.dto';
import { NotificationGateway, NotificationPayload } from '../notification/notification.gateway';

@Injectable()
export class UpstreamCommentService {
    private readonly logger = new Logger(UpstreamCommentService.name);

    constructor(
        @InjectRepository(UpstreamComment)
        private upstreamCommentRepository: Repository<UpstreamComment>,
        @InjectRepository(Upstream)
        private upstreamRepository: Repository<Upstream>,
        private readonly notificationGateway: NotificationGateway,
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

        // 알림 전송: 업스트림 업로더에게 새 댓글 알림
        await this.sendCommentCreatedNotification(savedUpstreamComment);

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
            return {
                success: true,
                message: 'No upstream comments found',
                upstreamComments: [],
            };
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

    // 댓글 생성 알림 전송
    private async sendCommentCreatedNotification(comment: UpstreamComment) {
        try {
            // 업스트림 정보와 업로더 정보 조회
            const upstream = await this.upstreamRepository.findOne({
                where: { id: comment.upstream.id },
                relations: ['user', 'stage', 'stage.track'],
            });

            if (!upstream || !upstream.user) {
                this.logger.error(`Upstream or uploader not found for comment notification: ${comment.id}`);
                return;
            }

            // 댓글 작성자와 업스트림 업로더가 같으면 알림을 보내지 않음
            if (comment.user.id === upstream.user.id) {
                return;
            }

            // 알림 페이로드 생성
            const notification: NotificationPayload = {
                type: 'upstream_reviewed',
                title: '💬 새 리뷰',
                message: `${upstream.title}`,
                data: {
                    commentId: comment.id,
                    upstreamId: upstream.id,
                    stageId: upstream.stage?.id,
                    trackId: upstream.stage?.track?.id,
                    upstreamTitle: upstream.title,
                    commentContent: comment.comment,
                    commenter: comment.user?.id,
                },
                timestamp: new Date().toISOString(),
                read: false,
            };

            // 업스트림 업로더에게 알림 전송
            this.notificationGateway.sendNotificationToUser(upstream.user.id, notification);

            this.logger.log(`Comment created notification sent to uploader ${upstream.user.id} for comment: ${comment.id}`);
        } catch (error) {
            this.logger.error(`Failed to send comment created notification: ${error.message}`);
        }
    }
}
