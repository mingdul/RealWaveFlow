import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpstreamReview } from './upstream-review.entity';
import { CreateUpstreamReviewDto } from './dto/createUpstreamReview.dto';

@Injectable()
export class UpstreamReviewService {

    constructor(
        @InjectRepository(UpstreamReview)
        private upstreamReviewRepository: Repository<UpstreamReview>,
    ) {}

    async createUpstreamReview(createUpstreamReviewDto: CreateUpstreamReviewDto) {
        const { upstream_id, stage_reviewer_id } = createUpstreamReviewDto;

        const upstreamReview = this.upstreamReviewRepository.create({
            upstream: { id: upstream_id },
            stage_reviewer: { id: stage_reviewer_id },
        });

        const savedUpstreamReview = await this.upstreamReviewRepository.save(upstreamReview);
        if (!savedUpstreamReview) {
            throw new BadRequestException('Failed to create upstream review');
        }
        return {
            success: true,
            message: 'Upstream review created successfully',
            upstream_review: savedUpstreamReview,
        };
    }
}
