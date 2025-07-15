import { Injectable, Logger } from '@nestjs/common';
import { StemJob } from './stem-job.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Stem } from '../stem/stem.entity';
import { VersionStem } from '../version-stem/version-stem.entity';
import { Stage } from '../stage/stage.entity';
import { VersionStemService } from '../version-stem/version-stem.service';
import { SqsService } from '../sqs/service/sqs.service';
import { StageService } from '../stage/stage.service';

@Injectable()
export class StemJobService {
    private readonly logger = new Logger(StemJobService.name);
    
    constructor(
        @InjectRepository(StemJob)
        private stemJobRepository: Repository<StemJob>,
        @InjectRepository(Stem)
        private stemRepository: Repository<Stem>,
        @InjectRepository(VersionStem)
        private versionStemRepository: Repository<VersionStem>,
        @InjectRepository(Stage)
        private stageRepository: Repository<Stage>,
        private sqsService: SqsService,
        private versionStemService: VersionStemService,
        private stageService: StageService,
    ) {}

    async dubjob(jobData: {
        file_name: string;
        file_path: string;
        category_id?: string;
        upstream_id?: string;
        stage_id: string;
        track_id: string;
        key?: string;
        bpm?: string;
        instrument? : string;
    }, userId: string): Promise<StemJob> {
        const job = this.stemJobRepository.create({
            file_name: jobData.file_name,
            file_path: jobData.file_path,
            category_id: jobData.category_id || null, 
            upstream_id: jobData.upstream_id || null,
            stage_id: jobData.stage_id,
            track_id: jobData.track_id,
            key: jobData.key,
            bpm: jobData.bpm,
            instrument : jobData.instrument,
            user_id: userId,
            jobtype : 'dub',
            uploaded_at: new Date(),
        });

        const savedJob = await this.stemJobRepository.save(job);
        
        // SQS로 해시 생성 요청 보내기
        await this.sqsService.sendHashGenerationRequest({
            userId: userId,
            trackId: jobData.track_id,
            stemId: savedJob.id,
            stageId: jobData.stage_id,
            filepath: jobData.file_path,
            timestamp: new Date().toISOString(),
            original_filename: jobData.file_name,
        });

        this.logger.log(`Stem job 생성 및 해시 생성 요청 전송: ${savedJob.id}`);
        return savedJob;
    }

    async createJob(jobData: {
        file_name: string;
        file_path: string;
        category_id?: string;
        upstream_id?: string;
        stage_id: string;
        track_id: string;
        key?: string;
        bpm?: string;
        instrument? : string;
    }, userId: string): Promise<StemJob> {
        const job = this.stemJobRepository.create({
            file_name: jobData.file_name,
            file_path: jobData.file_path,
            category_id: jobData.category_id || null, // category는 나중에 생성됨
            upstream_id: jobData.upstream_id || null,
            stage_id: jobData.stage_id,
            track_id: jobData.track_id,
            key: jobData.key,
            bpm: jobData.bpm,
            instrument : jobData.instrument,
            user_id: userId,
            uploaded_at: new Date(),
        });

        const savedJob = await this.stemJobRepository.save(job);
        
        // SQS로 해시 생성 요청 보내기
        await this.sqsService.sendHashGenerationRequest({
            userId: userId,
            trackId: jobData.track_id,
            stemId: savedJob.id,
            stageId: jobData.stage_id,
            filepath: jobData.file_path,
            timestamp: new Date().toISOString(),
            original_filename: jobData.file_name,
        });

        this.logger.log(`Stem job 생성 및 해시 생성 요청 전송: ${savedJob.id}`);
        return savedJob;
    }

    async findJobById(id: string): Promise<StemJob | null> {
        return await this.stemJobRepository.findOne({ where: { id } });
    }

    async findJobsByTrackId(trackId: string): Promise<StemJob[]> {
        return await this.stemJobRepository.find({
            where: { track_id: trackId }
        });
    }

    async checkDuplicateHash(trackId: string, audioHash: string, stageId: string): Promise<boolean> {
        // 현재 스테이지 조회
        const currentStage = await this.stageRepository.findOne({
            where: { id: stageId },
            relations: ['track']
        });

        if (!currentStage) {
            return false;
        }

        // 현재 스테이지보다 version이 1 작은 스테이지 조회
        const targetStage = await this.stageRepository.findOne({
            where: {
                track: { id: trackId },
                version: currentStage.version - 1
            },
            relations: ['track']
        });

        if (!targetStage) {
            return false;
        }

        // targetStage에서 같은 audioHash를 가진 version stem이 있는지 확인
        const existingVersionStem = await this.versionStemRepository.findOne({
            where: {
                stem_hash: audioHash,
                stage: { id: targetStage.id },
                track: { id: trackId }
            },
            relations: ['stage', 'track']
        });

        return !!existingVersionStem;
    }
    async updateJobWithHash(jobId: string, audioHash: string): Promise<StemJob | null> {
        const job = await this.stemJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            return null;
        }

        job.stem_hash = audioHash;
        return await this.stemJobRepository.save(job);
    }

    async updateJobWithCategoryId(jobId: string, categoryId: string): Promise<StemJob | null> {
        const job = await this.stemJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            return null;
        }

        job.category_id = categoryId;
        return await this.stemJobRepository.save(job);
    }

    async updateJobWithUpstreamId(jobId: string, upstreamId: string): Promise<StemJob | null> {
        const job = await this.stemJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            return null;
        }

        job.upstream_id = upstreamId;
        return await this.stemJobRepository.save(job);
    }

    async updateJobWithWavePath(jobId: string, audioWavePath: string): Promise<StemJob | null> {
        const job = await this.stemJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            return null;
        }

        job.audio_wave_path = audioWavePath;
        return await this.stemJobRepository.save(job);
    }

    async deleteJob(jobId: string): Promise<void> {
        await this.stemJobRepository.delete(jobId);
        this.logger.log(`Stem job 삭제 완료: ${jobId}`);
    }

    async convertJobToStemNoVersion(jobId: string, userId: string): Promise<Stem | null> {
        const job = await this.stemJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            return null;
        }

        if (!job.category_id) {
            this.logger.error(`Category ID가 없어서 Stem 생성 불가: ${jobId}`);
            return null;
        }

        // Stem 엔티티 생성
        const stem = this.stemRepository.create({
            file_name: job.file_name,
            stem_hash: job.stem_hash,
            file_path: job.file_path,
            key: job.key,
            bpm: job.bpm,
            audio_wave_path: job.audio_wave_path,
            category: { id: job.category_id },
            upstream: job.upstream_id ? { id: job.upstream_id } : null,
            uploaded_at: new Date(),
            user: { id: userId }
        });
        console.log(`${job.upstream_id}`)

        return  await this.stemRepository.save(stem);
    }

    async convertJobToStem(jobId: string, userId: string): Promise<Stem | null> {
        const job = await this.stemJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            return null;
        }

        if (!job.category_id) {
            this.logger.error(`Category ID가 없어서 Stem 생성 불가: ${jobId}`);
            return null;
        }

        // Stem 엔티티 생성
        const stem = this.stemRepository.create({
            file_name: job.file_name,
            stem_hash: job.stem_hash,
            file_path: job.file_path,
            key: job.key,
            bpm: job.bpm,
            audio_wave_path: job.audio_wave_path,
            category: { id: job.category_id },
            upstream: job.upstream_id ? { id: job.upstream_id } : null,
            uploaded_at: new Date(),
            user: { id: userId }
        });

        const savedStem = await this.stemRepository.save(stem);
        
        // Version-Stem 생성 (Stem → version-Stem 변환)
        try {
            await this.versionStemService.createVersionStem({
                file_name: job.file_name,
                stem_hash: job.stem_hash,
                file_path: job.file_path,
                key: job.key,
                bpm: job.bpm,
                audio_wave_path: job.audio_wave_path,
                category_id: job.category_id,
                stage_id: job.stage_id,
                user_id: userId,
                version: 1, // 기본값으로 1 설정
                track_id: job.track_id,
            });
            
            this.logger.log(`Version-Stem 생성 완료: ${savedStem.id}`);
        } catch (versionStemError) {
            this.logger.error(`Version-Stem 생성 실패: ${savedStem.id}`, versionStemError);
            // version-stem 생성 실패해도 stem은 이미 생성되었으므로 계속 진행
        }
        
        // job 삭제
        await this.deleteJob(jobId);
        
        this.logger.log(`Stem job을 Stem으로 변환 완료: ${jobId} -> ${savedStem.id}`);
        return savedStem;
    }

    async requestDeleteDuplicateFile(job: StemJob, userId: string): Promise<void> {
        // 중복 파일 삭제 요청을 SQS로 보내기
        await this.sqsService.sendDuplicateFileRequest({
            userId: userId,
            trackId: job.track_id,
            stemId: job.id,
            filepath: job.file_path,
            audio_hash: job.stem_hash,
        });

        this.logger.log(`중복 파일 삭제 요청 전송: ${job.id}`);
    }

    async sendAudioAnalysisRequest(job: StemJob, userId: string): Promise<void> {
        // 오디오 분석 요청을 SQS로 보내기
        await this.sqsService.sendAudioAnalysisRequest({
            userId: userId,
            trackId: job.track_id,
            stemId: job.id,
            filepath: job.file_path,
            audio_hash: job.stem_hash,
            timestamp: new Date().toISOString(),
            original_filename: job.file_name,
        });

        this.logger.log(`오디오 분석 요청 전송: ${job.id}`);
    }
}
