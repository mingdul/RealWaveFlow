import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Stage } from './stage.entity';
import { CreateStageDto } from './dto/createStage.dto';
import { SqsService } from '../sqs/service/sqs.service';
import { VersionStemService } from '../version-stem/version-stem.service';
import { StageReviewerService } from 'src/stage-reviewer/stage-reviewer.service';
import { NotificationGateway, NotificationPayload } from '../notification/notification.gateway';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';
import { Track } from '../track/track.entity';

@Injectable()
export class StageService {
    private readonly logger = new Logger(StageService.name);
    
    constructor(    
        @InjectRepository(Stage)
        private stageRepository: Repository<Stage>,
        @InjectRepository(Track)
        private trackRepository: Repository<Track>,
        @InjectRepository(TrackCollaborator)
        private trackCollaboratorRepository: Repository<TrackCollaborator>,
        private sqsService: SqsService,
        private versionStemService: VersionStemService,
        private stageReviewerService: StageReviewerService,
        private notificationGateway: NotificationGateway,
    ) {}

    async createStage(createStageDto: CreateStageDto) {
        const { title, description, user_id, track_id, status } = createStageDto;
        const lastStage = await this.stageRepository.findOne({
            where: { track: { id: track_id } },
            order: { version: 'DESC' },
        });
        const stage = this.stageRepository.create({
            title,
            description,
            user: { id: user_id },
            track: { id: track_id },
            version: lastStage ? lastStage.version + 1 : 1,
            created_at: new Date(),
            status,
            guide_path: null,
        });

        const savedStage = await this.stageRepository.save(stage);
        if (!savedStage) {
            throw new BadRequestException('Failed to create stage');
        }

        const stageReviewer =  await this.stageReviewerService.createStageReviewer({
            stage_id: savedStage.id,
            user_id: user_id,
        });

        if (!stageReviewer) {
            throw new BadRequestException('Failed to create stage reviewer');
        }

        // 알림 전송: 트랙의 모든 사용자에게 새 스테이지 생성 알림
        await this.sendStageCreatedNotification(savedStage);

        return {
            success: true,
            message: 'Stage created successfully',
            data: savedStage,
        };
    }


    async getTrackStages(track_id: string) {
        const stages = await this.stageRepository.find({
            where: { track : { id : track_id } },
            relations: ['track', 'user'],
        });

        if (stages.length === 0) {
            throw new NotFoundException('No stages found');
        }
        return {
            success: true,
            message: 'Stages fetched successfully',
            data: stages,
        };
    }

    async getStage(stage_id: string) {
        const stage = await this.stageRepository.findOne({
            where: { id: stage_id },
            relations: ['track', 'user'],
        });

        if (!stage) {
            throw new NotFoundException('Stage not found');
        }
        return {
            success: true,
            message: 'Stage fetched successfully',
            data: stage,
        };
    }

    async getStageByTrackIdAndVersion(track_id: string, version: number) {
        const stage = await this.stageRepository.findOne({
            where: { track: { id: track_id }, version: version },
            relations: ['track', 'user'],
        });
        
        if (!stage) {
            throw new NotFoundException('Stage not found');
        }
        return {
            success: true,
            message: 'Stage fetched successfully',
            data: stage,
        };
    }

    async updateGuidePath(stageId: string, guidePath: string): Promise<Stage> {
        const stage = await this.stageRepository.findOne({
            where: { id: stageId }
        });

        if (!stage) {
            throw new NotFoundException('Stage not found');
        }

        stage.guide_path = guidePath;
        const updatedStage = await this.stageRepository.save(stage);
        
        this.logger.log(`Stage guide path 업데이트 완료: ${stageId} -> ${guidePath}`);
        return updatedStage;
        
    }

    async requestStemMixingByStageId(stageId: string): Promise<void> {
        const stage = await this.stageRepository.findOne({
            where: { id: stageId }
        });

        if (!stage) {
            throw new NotFoundException('Stage not found');
        }

        // stageId로 version-stem들의 path들을 조회
        const stemPaths = await this.versionStemService.getVersionStemPathsByStageId(stageId);

        // SQS로 믹싱 요청 보내기
        await this.sqsService.sendMixingStemsRequest({
            stageId: stageId,
            stem_paths: stemPaths,
            upstreamId : null,
        });

        this.logger.log(`스테이지 기반 믹싱 요청 전송: ${stageId}, 스템 개수: ${stemPaths.length}`);
    }

    async requestStemMixing(stageId: string, stemPaths: string[]): Promise<void> {
        const stage = await this.stageRepository.findOne({
            where: { id: stageId }
        });

        if (!stage) {
            throw new NotFoundException('Stage not found');
        }

        // SQS로 믹싱 요청 보내기
        await this.sqsService.sendMixingStemsRequest({
            stageId: stageId,
            stem_paths: stemPaths,
            upstreamId : null,
        });

        this.logger.log(`스템 믹싱 요청 전송: ${stageId}, 스템 개수: ${stemPaths.length}`);
    }



    async getBackToPreviousStage(trackId: string, version: number) {
        const stages = await this.stageRepository.find({
            where: { track: { id: trackId }, version: MoreThan(version) },
            relations: ['track', 'user'],
        });

        if (stages.length === 0) {
           return {
            success: true,
            message: 'No previous stage found',
           }
        }

        for (const stage of stages) {
            await this.stageRepository.delete(stage.id);
        }

        const remainingStages = await this.stageRepository.find({
            where: { track: { id: trackId }, version: MoreThan(version) },
        });

        if (remainingStages.length > 0) {
            throw new NotFoundException('Previous stage not found');
        }

        return {
            success: true,
            message: 'Stage deleted successfully',
        };
    }

    // 스테이지 생성 알림 전송
    private async sendStageCreatedNotification(stage: Stage) {
        try {
            // 트랙 정보와 소유자, 협업자 정보 조회
            const track = await this.trackRepository.findOne({
                where: { id: stage.track.id },
                relations: ['owner_id', 'collaborators', 'collaborators.user_id'],
            });

            if (!track) {
                this.logger.error(`Track not found for stage notification: ${stage.id}`);
                return;
            }

            // 알림을 받을 사용자 ID 목록 생성 (소유자 + 협업자)
            const userIds: string[] = [track.owner_id.id];
            
            // 협업자 추가
            if (track.collaborators) {
                track.collaborators.forEach(collaborator => {
                    if (collaborator.user_id?.id && !userIds.includes(collaborator.user_id.id)) {
                        userIds.push(collaborator.user_id.id);
                    }
                });
            }

            // 알림 페이로드 생성
            const notification: NotificationPayload = {
                id: `stage_created_${stage.id}_${Date.now()}`,
                type: 'stage_created',
                title: '새 스테이지가 생성되었습니다',
                message: `"${track.title}" 트랙에 "${stage.title}" 스테이지가 생성되었습니다.`,
                data: {
                    stageId: stage.id,
                    trackId: track.id,
                    stageTitle: stage.title,
                    trackTitle: track.title,
                    version: stage.version,
                },
                timestamp: new Date().toISOString(),
                read: false,
            };

            // 각 사용자에게 알림 전송
            this.notificationGateway.sendNotificationToUsers(userIds, notification);

            this.logger.log(`Stage created notification sent to ${userIds.length} users for stage: ${stage.id}`);
        } catch (error) {
            this.logger.error(`Failed to send stage created notification: ${error.message}`);
        }
    }
}
