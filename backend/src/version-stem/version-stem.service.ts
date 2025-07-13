import { BadRequestException, Injectable } from '@nestjs/common';
import { VersionStem } from './version-stem.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVersionStemDto } from './dto/createVersionStem.dto';

@Injectable()
export class VersionStemService {
    constructor(
        @InjectRepository(VersionStem)
        private versionStemRepository: Repository<VersionStem>,
    ) {}

    async createVersionStem(createVersionStemDto: CreateVersionStemDto) {
        const { file_name, file_path, key, bpm, stem_hash, stage_id, user_id, category_id } = createVersionStemDto;

        const versionStem = this.versionStemRepository.create({
            file_name,
            file_path,
            key,
            bpm,
            stem_hash,
            stage: { id: stage_id },
            user: { id: user_id },
            category: { id: category_id },
        });

        const savedVersionStem = await this.versionStemRepository.save(versionStem);
        if (!savedVersionStem) {
            throw new BadRequestException('Failed to create version stem');
        }
        return {
            success: true,
            message: 'Version stem created successfully',
            version_stem: savedVersionStem,
        };
    }
}
