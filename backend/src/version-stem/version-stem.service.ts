import { BadRequestException, Injectable } from '@nestjs/common';
import { VersionStem } from './version-stem.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';
import { CreateVersionStemDto } from './dto/createVersionStem.dto';
import { Category } from 'src/category/category.entity';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class VersionStemService {
    constructor(
        @InjectRepository(VersionStem)
        private versionStemRepository: Repository<VersionStem>,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
    ) {}

    async createVersionStem(createVersionStemDto: CreateVersionStemDto) {
        const { file_name, file_path, key, bpm, stem_hash, stage_id, user_id, category_id, version, track_id, audio_wave_path } = createVersionStemDto;

        const versionStem = this.versionStemRepository.create({
            file_name,
            file_path,
            key,
            bpm,
            stem_hash,
            stage: { id: stage_id },
            user: { id: user_id },
            category: { id: category_id },
            version,
            uploaded_at: new Date(),
            audio_wave_path,
            track: { id: track_id },
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

    async getVersionStemByStageId(stageId: string) {
        const versionStems = await this.versionStemRepository.find({
            where: { stage: { id: stageId } },
        });
        if (versionStems.length === 0) {
            throw new NotFoundException(`No version stems found for stage: ${stageId}`);
        }
        return {
            success: true,
            message: 'Version stems retrieved successfully',
            data : versionStems,
        };
    }

    async getVersionStemPathsByStageId(stageId: string): Promise<string[]> {
        const versionStems = await this.versionStemRepository.find({
            where: { stage: { id: stageId } },
            select: ['file_path'],
        });

        if (versionStems.length === 0) {
            throw new NotFoundException(`No version stems found for stage: ${stageId}`);
        }

        return versionStems.map(stem => stem.file_path);
    }

    async getLatestStemsPerCategoryByTrack(trackId: string, version: number) {
        const categories = await this.categoryRepository.find({
          where: { track: { id: trackId } },
        });
      
        const results = [];
      
        for (const category of categories) {
          const latestStem = await this.versionStemRepository.findOne({
            where: {
              track: { id: trackId },
              category: { id: category.id },
              version: Raw((alias) => `${alias} <= :version`, { version: version }),
            },
            order: {
              version: 'DESC',
              uploaded_at: 'DESC',
            },
            relations: ['category', 'track', 'stage', 'user'],
          });
      
          if (latestStem) {
            results.push({
              category: category.name,
              stem: latestStem,
            });
          }
        }
      
        if (results.length === 0) {
          throw new NotFoundException('No stems found for the given version');
        }
      
        return {
          success: true,
          message: 'Stems for the given version retrieved successfully',
          data: results,
        };
      }
}
