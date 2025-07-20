import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StageReviewer } from './stage-reviewer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateStageReviewerDto } from './dto/createStageReviewer.dto';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StageReviewerService {
    private readonly s3: S3Client;
    private readonly bucketName: string;

    constructor(
        @InjectRepository(StageReviewer)
        private stageReviewerRepository: Repository<StageReviewer>,
        @InjectRepository(TrackCollaborator)
        private trackCollaboratorRepository: Repository<TrackCollaborator>,
    ) {
        this.s3 = new S3Client({
            region: process.env.AWS_REGION,
        });
        this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'waveflow-bucket';
    }

    private async generatePresignedUrl(imageKey: string): Promise<string | null> {
        if (!imageKey) {
            return null;
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: imageKey,
            });

            const presignedUrl = await getSignedUrl(this.s3, command, {
                expiresIn: 3600 // 1시간
            });

            return presignedUrl;
        } catch (error) {
            console.error('Error generating presigned URL for key:', imageKey, error);
            return null;
        }
    }

    async createStageReviewer(createStageReviewerDto: CreateStageReviewerDto) {
        const { stage_id, user_id } = createStageReviewerDto;
        const stageReviewer = this.stageReviewerRepository.create({
            stage: { id: stage_id },
            user: { id: user_id },
        });

        const savedStageReviewer = await this.stageReviewerRepository.save(stageReviewer);
        if (!savedStageReviewer) {
            throw new BadRequestException('Failed to create stage reviewer');
        }
        return {
            success: true,
            message: 'Stage reviewer created successfully',
            stage_reviewer: savedStageReviewer,
        };
    }

    async getStageReviewers(stage_id: string) {
        const stageReviewers = await this.stageReviewerRepository.find({
            where: { stage: { id: stage_id } },
            relations: ['user', 'stage', 'stage.track'],
        });

        // 각 reviewer에 대해 track collaborator 정보와 presigned URL 추가
        const reviewersWithDetails = await Promise.all(
            stageReviewers.map(async (reviewer) => {
                // Track collaborator 정보 조회
                const trackCollaborator = await this.trackCollaboratorRepository.findOne({
                    where: {
                        user_id: { id: reviewer.user.id },
                        track_id: { id: reviewer.stage.track.id }
                    }
                });

                // Presigned URL 생성
                const imageUrl = await this.generatePresignedUrl(reviewer.user.image_url);

                return {
                    id: reviewer.id,
                    user: {
                        id: reviewer.user.id,
                        username: reviewer.user.username,
                        email: reviewer.user.email,
                        image_url: imageUrl,
                    },
                    role: trackCollaborator?.role || 'Collaborator',
                    stage: {
                        id: reviewer.stage.id,
                        track: {
                            id: reviewer.stage.track.id
                        }
                    }
                };
            })
        );

        return {
            success: true,
            message: stageReviewers.length > 0 ? 'Stage reviewers fetched successfully' : 'No stage reviewers found',
            stage_reviewers: reviewersWithDetails,
        };
    }     
}
