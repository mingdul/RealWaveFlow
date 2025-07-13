import { BadRequestException, Injectable } from '@nestjs/common';
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
    
}
