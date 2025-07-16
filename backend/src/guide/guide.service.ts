import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guide } from './guide.entity';
import { Stage } from 'src/stage/stage.entity';
import { Stem } from 'src/stem/stem.entity';
import { VersionStem } from 'src/version-stem/version-stem.entity';

@Injectable()
export class GuideService {
    private readonly logger = new Logger(GuideService.name);

    constructor(
        @InjectRepository(Guide)
        private guideRepository: Repository<Guide>,
        @InjectRepository(Stage)
        private stageRepository: Repository<Stage>,
        @InjectRepository(Stem)
        private stemRepository: Repository<Stem>,
        @InjectRepository(VersionStem)
        private versionStemRepository: Repository<VersionStem>,
    ) {}

    
    // 해당 서비스는 init이나 done 이 되었을때만 사용
    async createGuideFromMixing(data: {
        task_id: string;
        stageId: string;
        status: string;
        mixed_file_path: string;
        waveform_data_path: string;
        stem_count: number;
        stem_paths: string[];
        processed_at: string;
    }): Promise<Guide> {
        const { stageId, mixed_file_path, waveform_data_path, stem_paths } = data;

        // Stage 조회
        const stage = await this.stageRepository.findOne({
            where: { id: stageId },
            relations: ['track', 'guide']
        });

        if (!stage) {
            throw new NotFoundException(`Stage not found: ${stageId}`);
        }

        let guide: Guide;

        // 이미 Guide가 존재하는지 확인 (OneToOne 관계)
        if (stage.guide) {
            this.logger.warn(`Guide already exists for stage: ${stageId}, updating existing guide`);
            // 기존 Guide 업데이트
            stage.guide.mixed_file_path = mixed_file_path;
            stage.guide.waveform_data_path = waveform_data_path;
            
            guide = await this.guideRepository.save(stage.guide);
        } else {
            // 새 Guide 생성
            const newGuide = this.guideRepository.create({
                mixed_file_path,
                waveform_data_path,
                stage,
                track: stage.track
            });

            guide = await this.guideRepository.save(newGuide);
        }

        // stem_paths로 Stem들만 찾아서 연결
        await this.linkStemsToGuide(guide, stem_paths);

        this.logger.log(`Guide 생성/업데이트 완료: ${guide.id} (Stage: ${stageId})`);
        return guide;
    }

    private async linkStemsToGuide(guide: Guide, stemPaths: string[]): Promise<void> {
        // 기존 관계를 가져와서 수정
        const guideWithRelations = await this.guideRepository.findOne({
            where: { id: guide.id },
            relations: ['stems']
        });

        if (!guideWithRelations) {
            throw new NotFoundException(`Guide not found: ${guide.id}`);
        }

        // 새로 추가할 Stem들 찾기
        const newStems: Stem[] = [];

        for (const stemPath of stemPaths) {
            // Stem에서 찾기
            const stem = await this.stemRepository.findOne({
                where: { file_path: stemPath }
            });

            if (stem) {
                // 이미 연결되어 있지 않은 경우에만 추가
                const isAlreadyLinked = guideWithRelations.stems.some(s => s.id === stem.id);
                if (!isAlreadyLinked) {
                    newStems.push(stem);
                    this.logger.log(`Stem 연결 예정: ${stem.id} -> Guide: ${guide.id}`);
                }
            } else {
                this.logger.warn(`Stem을 찾을 수 없음: ${stemPath}`);
            }
        }

        // ManyToMany 관계 업데이트
        if (newStems.length > 0) {
            guideWithRelations.stems = [...guideWithRelations.stems, ...newStems];
        }

        // 저장
        await this.guideRepository.save(guideWithRelations);
        this.logger.log(`Guide 관계 업데이트 완료: ${newStems.length}개 Stem 추가`);
    }

    async addStemsToGuide(guideId: string, stemIds: string[]): Promise<Guide> {
        const guide = await this.guideRepository.findOne({
            where: { id: guideId },
            relations: ['stems']
        });

        if (!guide) {
            throw new NotFoundException(`Guide not found: ${guideId}`);
        }

        const stems = await this.stemRepository.findByIds(stemIds);
        
        // 기존 stems에 새로운 stems 추가 (중복 제거)
        const existingIds = guide.stems.map(s => s.id);
        const newStems = stems.filter(s => !existingIds.includes(s.id));
        
        guide.stems = [...guide.stems, ...newStems];
        
        return await this.guideRepository.save(guide);
    }

    async addVersionStemsToGuide(guideId: string, versionStemIds: string[]): Promise<Guide> {
        const guide = await this.guideRepository.findOne({
            where: { id: guideId },
            relations: ['version_stems']
        });

        if (!guide) {
            throw new NotFoundException(`Guide not found: ${guideId}`);
        }

        const versionStems = await this.versionStemRepository.findByIds(versionStemIds);
        
        // 기존 version_stems에 새로운 version_stems 추가 (중복 제거)
        const existingIds = guide.version_stems.map(vs => vs.id);
        const newVersionStems = versionStems.filter(vs => !existingIds.includes(vs.id));
        
        guide.version_stems = [...guide.version_stems, ...newVersionStems];
        
        return await this.guideRepository.save(guide);
    }

    async removeStemsFromGuide(guideId: string, stemIds: string[]): Promise<Guide> {
        const guide = await this.guideRepository.findOne({
            where: { id: guideId },
            relations: ['stems']
        });

        if (!guide) {
            throw new NotFoundException(`Guide not found: ${guideId}`);
        }

        guide.stems = guide.stems.filter(s => !stemIds.includes(s.id));
        
        return await this.guideRepository.save(guide);
    }

    async removeVersionStemsFromGuide(guideId: string, versionStemIds: string[]): Promise<Guide> {
        const guide = await this.guideRepository.findOne({
            where: { id: guideId },
            relations: ['version_stems']
        });

        if (!guide) {
            throw new NotFoundException(`Guide not found: ${guideId}`);
        }

        guide.version_stems = guide.version_stems.filter(vs => !versionStemIds.includes(vs.id));
        
        return await this.guideRepository.save(guide);
    }

    async getGuidesByStage(stageId: string): Promise<Guide[]> {
        return await this.guideRepository.find({
            where: { stage: { id: stageId } },
            relations: ['stage', 'track', 'stems', 'version_stems']
        });
    }

    async getGuidesByTrack(trackId: string): Promise<Guide[]> {
        return await this.guideRepository.find({
            where: { track: { id: trackId } },
            relations: ['stage', 'track', 'stems', 'version_stems']
        });
    }

    async getGuideById(guideId: string): Promise<Guide> {
        const guide = await this.guideRepository.findOne({
            where: { id: guideId },
            relations: ['stage', 'track', 'stems', 'version_stems']
        });

        if (!guide) {
            throw new NotFoundException(`Guide not found: ${guideId}`);
        }

        return guide;
    }

    async getGuideByStageId(stageId: string): Promise<Guide | null> {
        return await this.guideRepository.findOne({
            where: { stage: { id: stageId } },
            relations: ['stage', 'track', 'stems', 'version_stems']
        });
    }

    async getStemsByTrackAndVersion(trackId: string, version: number): Promise<Stem[]> {
        this.logger.log(`Getting stems for track ${trackId} version ${version}`);

        // 1. 해당 track의 version을 가진 stage 찾기
        const stage = await this.stageRepository.findOne({
            where: { 
                track: { id: trackId },
                version: version
            },
            relations: ['track', 'guide']
        });

        if (!stage) {
            throw new NotFoundException(`Stage not found for track ${trackId} with version ${version}`);
        }

        this.logger.log(`Found stage: ${stage.id} for track ${trackId} version ${version}`);

        // 2. 해당 stage의 guide가 없으면 빈 배열 반환
        if (!stage.guide) {
            this.logger.log(`No guide found for stage ${stage.id}`);
            return [];
        }

        // 3. Guide의 stems 조회
        const guide = await this.guideRepository.findOne({
            where: { id: stage.guide.id },
            relations: [
                'stems', 
                'stems.category',
                'stems.track'
            ]
        });

        if (!guide) {
            throw new NotFoundException(`Guide not found for stage ${stage.id}`);
        }

        this.logger.log(`Found ${guide.stems.length} stems in guide ${guide.id}`);

        return guide.stems;
    }
} 