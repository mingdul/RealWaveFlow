import { BadRequestException, Injectable, Logger, NotFoundException  } from '@nestjs/common';
import { Upstream } from './upstream.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUpstreamDto } from './dto/createUpstream.dto';
import { UpstreamReviewService } from 'src/upstream-review/upstream-review.service';
import { StemSetCreateDto } from './dto/stemSetCreate.dto';
import { VersionStem } from '../version-stem/version-stem.entity';
import { StemJob } from '../stem-job/stem-job.entity';
import { StemPairDto } from './dto/stemPair.dto';
import { StemJobService } from 'src/stem-job/stem-job.service';
import { NewCategoryStemDto } from './dto/newCategoryStem.dto';
import { CategoryService } from 'src/category/category.service';
import { Category } from 'src/category/category.entity';
import { Stage } from 'src/stage/stage.entity';
import { SqsService } from '../sqs/service/sqs.service';

@Injectable()
export class UpstreamService {
    private readonly logger = new Logger(UpstreamService.name);

    constructor(
        @InjectRepository(Upstream)
        private upstreamRepository: Repository<Upstream>,
        @InjectRepository(VersionStem)
        private versionStemRepository: Repository<VersionStem>,
        @InjectRepository(StemJob)
        private stemJobRepository: Repository<StemJob>,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
        @InjectRepository(Stage)
        private stageRepository: Repository<Stage>,
        private readonly stemJobService : StemJobService,
        private readonly categoryService : CategoryService,
        private readonly sqsService: SqsService,
        private readonly upstreamReviewService: UpstreamReviewService,

    ) {}

        /** 외부에서 호출할 단일 엔드포인트 */
    async createUpstreamWithStems(dto: StemSetCreateDto) { 
        // 1) Upstream 생성
        const { title, description, stage_id, user_id  } = dto.upstream;
        const upstream = this.upstreamRepository.create({
            title,
            description,
            status: 'ACTIVE', // 기본 상태 설정
            stage: { id: stage_id },
            user: { id: user_id },
        });

        const stage = await this.stageRepository.findOne({
            where: { id: stage_id },
            relations: ['track'],      // ← 여기에 track 관계를 로드하도록 명시
          });

        // 2) Upstream 저장
        const savedUpstream = await this.upstreamRepository.save(upstream);
        if (!savedUpstream) {
            throw new BadRequestException('Failed to create upstream');
        }

        await this.upstreamReviewService.createUpstreamReview({
            upstream_id: savedUpstream.id,
            stage_id: stage_id,
        });
        
        // 파일 경로 수집을 위한 배열
        const allFilePaths: string[] = [];
        const audioAnalysisRequests: Array<{
            filePath: string;
            stemId: string;
            audioHash: string;
            originalFilename: string;
        }> = []; // 오디오 분석이 필요한 파일들

        //newCategory stem 처리
        for (const categoryNew of dto.new_category_stem){
            const { filePath, needsAudioAnalysis, stemId, audioHash, originalFilename } = await this.createNewCategoryStemWithPath(
                stage.track.id, 
                user_id, 
                categoryNew, 
                savedUpstream.id
            );
            allFilePaths.push(filePath);
            if (needsAudioAnalysis && stemId && audioHash && originalFilename) {
                audioAnalysisRequests.push({
                    filePath,
                    stemId,
                    audioHash,
                    originalFilename
                });
            }
        }

        // 3) Stem 세트 처리
        for (const pair of dto.stem_set) {
            const { filePath, needsAudioAnalysis, stemId, audioHash, originalFilename } = await this.processStemPairWithPath(
                pair, 
                savedUpstream.id, 
                user_id, 
                stage_id
            );
            if (filePath) {
                allFilePaths.push(filePath);
                if (needsAudioAnalysis && stemId && audioHash && originalFilename) {
                    audioAnalysisRequests.push({
                        filePath,
                        stemId,
                        audioHash,
                        originalFilename
                    });
                }
            }
        }

        // 5) 믹싱 요청 (모든 파일 경로들로)
        if (allFilePaths.length > 0) {
            await this.requestMixing(allFilePaths, savedUpstream.id, stage_id);
        }

        return {
            success: true,
            message: 'Upstream with stems created successfully',
            data: savedUpstream,
        };
    }

    async createNewCategoryStem(trackId : string, user_id : string, new_dto : NewCategoryStemDto){
        const category = this.categoryRepository.create({
            name : new_dto.categoryName,
            track : {id : trackId},
        });
        await this.categoryRepository.save(category);
        await this.stemJobService.updateJobWithCategoryId(new_dto.newStemId, category.id);
        await this.stemJobService.convertJobToStemNoVersion(new_dto.newStemId, user_id);
        await this.stemJobService.deleteJob(new_dto.newStemId);
    }

    async createNewCategoryStemWithPath(trackId: string, user_id: string, new_dto: NewCategoryStemDto, upstreamId: string): Promise<{ filePath: string; needsAudioAnalysis: boolean; stemId?: string; audioHash?: string; originalFilename?: string }> {
        // StemJob 조회하여 filePath 가져오기
        const stemJob = await this.stemJobRepository.findOne({
            where: { id: new_dto.newStemId }
        });

        if (!stemJob) {
            throw new NotFoundException(`StemJob not found: ${new_dto.newStemId}`);
        }

        const category = this.categoryRepository.create({
            name : new_dto.categoryName,
            track : {id : trackId},
            instrument : new_dto.instrument, 
        });
        await this.categoryRepository.save(category);

        // upstream_id 설정
        await this.stemJobService.updateJobWithCategoryId(new_dto.newStemId, category.id);
        await this.stemJobService.updateJobWithUpstreamId(new_dto.newStemId, upstreamId);
        await this.stemJobService.convertJobToStemNoVersion(new_dto.newStemId, user_id);
        await this.stemJobService.deleteJob(new_dto.newStemId);

        return {
            filePath: stemJob.file_path,
            needsAudioAnalysis: true, // newStem이므로 오디오 분석 필요
            stemId: stemJob.id,
            audioHash: stemJob.stem_hash,
            originalFilename: stemJob.file_name
        };
    }

        async processStemPair(pair: StemPairDto, upstream_id: string, user_id: string, current_stage_id?: string) {
        const { oldStem , newStem } = pair;
        
        if(oldStem && newStem){ // 교체: 기존 스템을 새로운 스템으로 교체
            const category = await this.categoryService.getCategoryByStemId(oldStem);
            // oldstem의 category id를 newStem에 넣어준다.
            await this.stemJobService.updateJobWithCategoryId(newStem, category.id);
            await this.stemJobService.updateJobWithUpstreamId(newStem, upstream_id);
            await this.stemJobService.convertJobToStemNoVersion(newStem, user_id);
            await this.stemJobService.deleteJob(newStem);
        }
 
    }

    async processStemPairWithPath(pair: StemPairDto, upstream_id: string, user_id: string, current_stage_id?: string): Promise<{ filePath?: string; needsAudioAnalysis: boolean; stemId?: string; audioHash?: string; originalFilename?: string }> {
        const { oldStem , newStem } = pair;
        
        if(oldStem && newStem){ // 교체: 기존 스템을 새로운 스템으로 교체
            // StemJob 조회하여 filePath 가져오기
            const stemJob = await this.stemJobRepository.findOne({
                where: { id: newStem }
            });

            if (!stemJob) {
                throw new NotFoundException(`StemJob not found: ${newStem}`);
            }

            const category = await this.categoryService.getCategoryByStemId(oldStem);
            // oldstem의 category id를 newStem에 넣어준다.
            await this.stemJobService.updateJobWithCategoryId(newStem, category.id);
            await this.stemJobService.updateJobWithUpstreamId(newStem, upstream_id);
            await this.stemJobService.convertJobToStemNoVersion(newStem, user_id);
            await this.stemJobService.deleteJob(newStem);

            return {
                filePath: stemJob.file_path,
                needsAudioAnalysis: true, // newStem이므로 오디오 분석 필요
                stemId: stemJob.id,
                audioHash: stemJob.stem_hash,
                originalFilename: stemJob.file_name
            };
        }
        else if(oldStem && !newStem){ // 기존 스템 유지: oldStem을 그대로 사용
            // VersionStem 조회하여 filePath 가져오기
            const oldVersionStem = await this.versionStemRepository.findOne({
                where: { id: oldStem }
            });

            if (!oldVersionStem) {
                throw new NotFoundException(`VersionStem not found: ${oldStem}`);
            }

            return {
                filePath: oldVersionStem.file_path,
                needsAudioAnalysis: false // 기존 스템이므로 오디오 분석 불필요
            };
        }
        
        // (!oldStem && newStem) 케이스는 createNewCategoryStemWithPath에서 처리됨
        // (!oldStem && !newStem) 케이스는 무시 (빈 슬롯)
        return { needsAudioAnalysis: false };
    }

    async requestAudioAnalysis(filePath: string, upstreamId: string, userId: string, stemId: string, trackId: string, audioHash: string, originalFilename: string): Promise<void> {
        // SQS로 오디오 분석 요청 보내기
        this.logger.log(`오디오 분석 요청: filePath=${filePath}, upstreamId=${upstreamId}, userId=${userId}`);
        
        await this.sqsService.sendAudioAnalysisRequest({
            userId,
            trackId,
            stemId,
            filepath: filePath,
            audio_hash: audioHash,
            timestamp: new Date().toISOString(),
            original_filename: originalFilename
        });
    }

    async requestMixing(filePaths: string[], upstreamId: string, stageId: string): Promise<void> {
        // SQS로 믹싱 요청 보내기
        this.logger.log(`믹싱 요청: filePaths=${filePaths.join(', ')}, upstreamId=${upstreamId}, stageId=${stageId}`);
        
        await this.sqsService.sendMixingStemsRequest({
            stageId,
            upstreamId,
            stem_paths: filePaths
        });
    }

    async updateUpstreamGuidePath(upstreamId: string, guidePath: string): Promise<void> {
        const upstream = await this.upstreamRepository.findOne({
            where: { id: upstreamId }
        });

        if (!upstream) {
            throw new NotFoundException(`Upstream not found: ${upstreamId}`);
        }

        upstream.guide_path = guidePath;
        await this.upstreamRepository.save(upstream);
        
        this.logger.log(`Upstream guide path 업데이트 완료: ${upstreamId} -> ${guidePath}`);
    }

    async getStageUpstreams(stage_id: string) {
        const upstreams = await this.upstreamRepository.find({
            where: { stage: { id: stage_id } },
            relations: ['stage', 'user'],
        });

        return {
            success: true,
            message: upstreams.length > 0 ? 'Upstreams fetched successfully' : 'No upstreams found',
            upstreams: upstreams
        };
    } 

    async getUpstreamGuidePath(upstream_id: string) {
        const upstream = await this.upstreamRepository.findOne({
            where: { id: upstream_id },
            relations: ['stage', 'user'],
        });

        if (!upstream) {
            throw new NotFoundException(`Upstream not found: ${upstream_id}`);
        }

        return {
            success: true,
            message: 'Upstream fetched successfully',
            guide_path: upstream.guide_path
        };
    }
    
}
