import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stage } from './stage.entity';
import { CreateStageDto } from './dto/createStage.dto';
import { SqsService } from '../sqs/service/sqs.service';
import { VersionStemService } from '../version-stem/version-stem.service';

@Injectable()
export class StageService {
    private readonly logger = new Logger(StageService.name);
    
    constructor(    
        @InjectRepository(Stage)
        private stageRepository: Repository<Stage>,
        private sqsService: SqsService,
        private versionStemService: VersionStemService,
    ) {}

    async createStage(createStageDto: CreateStageDto) {
        const { title, description, user_id, track_id } = createStageDto;
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
            status: 'active',
            guide_path: null,
        });

        const savedStage = await this.stageRepository.save(stage);
        if (!savedStage) {
            throw new BadRequestException('Failed to create stage');
        }
        return {
            success: true,
            message: 'Stage created successfully',
            stage: savedStage,
        };
    }


    async getTrackStages(track_id: string) {
        const stages = await this.stageRepository.find({
            where: { track: { id: track_id } },
            relations: ['track', 'user'],
        });

        if (stages.length === 0) {
            throw new NotFoundException('No stages found');
        }
        return {
            success: true,
            message: 'Stages fetched successfully',
            stages,
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
            stage,
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
        });

        this.logger.log(`스템 믹싱 요청 전송: ${stageId}, 스템 개수: ${stemPaths.length}`);
    }
}
