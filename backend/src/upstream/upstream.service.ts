import { BadRequestException, Injectable, NotFoundException  } from '@nestjs/common';
import { Upstream } from './upstream.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUpstreamDto } from './dto/createUpstream.dto';

@Injectable()
export class UpstreamService {

    constructor(
        @InjectRepository(Upstream)
        private upstreamRepository: Repository<Upstream>,
    ) {}

    async createUpstream(createUpstreamDto: CreateUpstreamDto) {
        const { title, description, stage_id, user_id  } = createUpstreamDto;
        const upstream = this.upstreamRepository.create({
            title,
            description,
            stage: { id: stage_id },
            user: { id: user_id },  
        });

        const savedUpstream = await this.upstreamRepository.save(upstream);
        if (!savedUpstream) {
            throw new BadRequestException('Failed to create upstream');
        }
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

        if (upstreams.length === 0) {
            throw new NotFoundException('No upstreams found');
        }
        return {
            success: true,
            message: 'Upstreams fetched successfully',
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
