import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stem } from './stem.entity';
import { CreateStemDto } from './dto/createStem.dto';
import { VersionStem } from 'src/version-stem/version-stem.entity';
import { Category } from 'src/category/category.entity';


@Injectable()
export class StemService {
    constructor(
        @InjectRepository(Stem)
        private stemRepository: Repository<Stem>,
        @InjectRepository(VersionStem)
        private versionStemRepository: Repository<VersionStem>,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
    ) {}

    async createStem(createStemDto: CreateStemDto) {
        const { category_id, upstream_id, file_name, stem_hash, file_path, key, bpm, user_id } = createStemDto;
        const stem = this.stemRepository.create({
            category: { id: category_id },
            upstream: { id: upstream_id },
            file_name,
            stem_hash,
            file_path,
            key,
            bpm,
            user: { id: user_id },
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


    async getUpstreamStems(trackId: string, upstreamId: string) {
        // 1. track의 모든 카테고리 조회
        const categories = await this.categoryRepository.find({
          where: { track: { id: trackId } },
        });
      
        // 2. upstream의 모든 stems 미리 조회 (한 번에)
        const upstreamStems = await this.stemRepository.find({
          where: { upstream: { id: upstreamId } },
          relations: ['category'],
        });
        const upstreamStemMap = new Map<string, Stem>();
        for (const stem of upstreamStems) {
          upstreamStemMap.set(stem.category.id, stem);
        }
      
        // 3. category별로 version_stem을 병렬로 fetch
        const versionStemPromises = categories.map(category =>
          this.versionStemRepository.findOne({
            where: {
              category: { id: category.id },
            },
            order: {
              version: 'DESC',
              uploaded_at: 'DESC',
            },
            relations: ['category', 'stage', 'user'],
          }),
        );
        const versionStems = await Promise.all(versionStemPromises);
        const versionStemMap = new Map<string, VersionStem>();
        versionStems.forEach((vs, i) => {
          if (vs) {
            versionStemMap.set(categories[i].id, vs);
          }
        });
      
        // 4. 최종 데이터 조립
        const result = [];
        for (const category of categories) {
          const catId = category.id;
          const upstreamStem = upstreamStemMap.get(catId);
          const versionStem = versionStemMap.get(catId);
      
          let type: 'new' | 'modify' | 'unchanged' | null = null;
          let stem: Stem | VersionStem | null = null;
      
          if (upstreamStem && versionStem) {
            type = 'modify';
            stem = upstreamStem;
          } else if (upstreamStem && !versionStem) {
            type = 'new';
            stem = upstreamStem;
          } else if (!upstreamStem && versionStem) {
            type = 'unchanged';
            stem = versionStem;
          }
      
          if (type && stem) {
            result.push({
              category,
              type,
              stem,
            });
          }
        }
      
        return {
          success: true,
          message: 'Stems fetched successfully',
          data: result, // [{ category, type, stem }, ...]
        };
      }

      // upstream 요청에서 오디오 분석 결과 업데이트
      async updateStemAudioWavePath(stemId: string, audioWavePath: string): Promise<void> {
        const stem = await this.stemRepository.findOne({
          where: { id: stemId }
        });

        if (!stem) {
          throw new BadRequestException(`Stem not found: ${stemId}`);
        }

        stem.audio_wave_path = audioWavePath;
        await this.stemRepository.save(stem);
      }


}
