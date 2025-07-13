import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stem } from './stem.entity';
import { CreateStemDto } from './dto/createStem.dto';

@Injectable()
export class StemService {
    constructor(
        @InjectRepository(Stem)
        private stemRepository: Repository<Stem>,
    ) {}

    async createStem(createStemDto: CreateStemDto) {
        const { category_id, upstream_id, file_name, stem_hash, file_path, key, bpm } = createStemDto;
        const stem = this.stemRepository.create({
            category: { id: category_id },
            upstream: { id: upstream_id },
            file_name,
            stem_hash,
            file_path,
            key,
            bpm,
            uploaded_at: new Date(),
        });

        const savedStem = await this.stemRepository.save(stem);
        if (!savedStem) {
            throw new BadRequestException('Failed to create stem');
        }
        return {
            success: true,
            message: 'Stem created successfully',
            stem: savedStem,
        };
    }
}
