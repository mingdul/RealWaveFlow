import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stage } from './stage.entity';
import { CreateStageDto } from './dto/createStage.dto';

@Injectable()
export class StageService {
    constructor(    
        @InjectRepository(Stage)
        private stageRepository: Repository<Stage>,
    ) {}

    async createStage(createStageDto: CreateStageDto) {
        const { title, description, version, user_id, track_id } = createStageDto;
        const stage = this.stageRepository.create({
            title,
            description,
            version,
            user: { id: user_id },
            track: { id: track_id },
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


    async getStages(track_id: string) {
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
    
}
