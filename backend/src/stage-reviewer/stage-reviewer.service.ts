import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StageReviewer } from './stage-reviewer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateStageReviewerDto } from './dto/createStageReviewer.dto';

@Injectable()
export class StageReviewerService {
    constructor(
        @InjectRepository(StageReviewer)
        private stageReviewerRepository: Repository<StageReviewer>,
    ) {}

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
            relations: ['user'],
        });

        return {
            success: true,
            message: stageReviewers.length > 0 ? 'Stage reviewers fetched successfully' : 'No stage reviewers found',
            stage_reviewers: stageReviewers,
        };
    }     
}
