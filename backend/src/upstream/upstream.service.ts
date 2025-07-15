import { BadRequestException, Injectable, NotFoundException  } from '@nestjs/common';
import { Upstream } from './upstream.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUpstreamDto } from './dto/createUpstream.dto';
import { UpstreamReviewService } from 'src/upstream-review/upstream-review.service';

@Injectable()
export class UpstreamService {

    constructor(
        @InjectRepository(Upstream)
        private upstreamRepository: Repository<Upstream>,
        private upstreamReviewService: UpstreamReviewService,
        ) {}

    async createUpstream(createUpstreamDto: CreateUpstreamDto) {
        const { title, description, stage_id, user_id  } = createUpstreamDto;
        const upstream = this.upstreamRepository.create({
            title,
            description,
            status: 'ACTIVE', // 기본 상태 설정
            stage: { id: stage_id },
            user: { id: user_id },  
        });

        const savedUpstream = await this.upstreamRepository.save(upstream);
        if (!savedUpstream) {
            throw new BadRequestException('Failed to create upstream');
        }

        const upstreamReview = await this.upstreamReviewService.createUpstreamReview({
            upstream_id: savedUpstream.id,
            stage_id: stage_id,
        });

        // upstreamReview는 항상 성공 응답을 반환하므로 별도 체크 불필요

        return {
            success: true,
            message: 'Upstream created successfully',
            upstream: savedUpstream,
        };
    }


    async getStageUpstreams(stage_id: string) {
        const upstreams = await this.upstreamRepository.find({
            where: { stage: { id: stage_id } },
            relations: ['stage', 'user'],
        });

        return {
            success: true,
            message: upstreams.length > 0 ? 'Upstreams fetched successfully' : 'No upstreams found',
            upstreams,
        };
    }   

    async getUpstream(upstream_id: string) {
        const upstream = await this.upstreamRepository.findOne({
            where: { id: upstream_id },
            relations: ['stage', 'user'],
        });

        if (!upstream) {
            throw new NotFoundException('Upstream not found');
        }
        return {
            success: true,
            message: 'Upstream fetched successfully',
            upstream,
        };
    }   
    
}
