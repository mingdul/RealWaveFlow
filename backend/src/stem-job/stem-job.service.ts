import { Injectable, Logger } from '@nestjs/common';
import { StemJob } from './stem-job.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Stem } from '../stem/stem.entity';
import { SqsService } from '../sqs/service/sqs.service';

@Injectable()
export class StemJobService {
    private readonly logger = new Logger(StemJobService.name);
    
    constructor(
        @InjectRepository(StemJob)
        private stemJobRepository: Repository<StemJob>,
        @InjectRepository(Stem)
        private stemRepository: Repository<Stem>,
        private sqsService: SqsService,
    ) {}

    async createJob(jobData: {
        file_name: string;
        file_path: string;
        category_id: string;
        upstream_id?: string;
        stage_id: string;
        track_id: string;
        key?: string;
        bpm?: string;
    }, userid): Promise<StemJob> {
        const job = this.stemJobRepository.create({
            file_name: jobData.file_name,
            file_path: jobData.file_path,
            category_id: jobData.category_id,
            upstream_id: jobData.upstream_id,
            stage_id: jobData.stage_id,
            track_id: jobData.track_id,
            key: jobData.key,
            bpm: jobData.bpm,
            uploaded_at: new Date(),
        });

        const savedJob = await this.stemJobRepository.save(job);
        
        // SQS로 해시 생성 요청 보내기
        await this.sqsService.sendHashGenerationRequest({
            userId: userid, // 추후 인증 시스템에서 받아올 예정
            trackId: jobData.track_id,
            stemId: savedJob.id,
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

    async checkDuplicateHash(trackId: string, audioHash: string): Promise<boolean> {
        // stem 테이블에서 해당 트랙의 해시가 이미 존재하는지 확인
        const existingStem = await this.stemRepository.findOne({
            where: { 
                stem_hash: audioHash,
                upstream: { stage: { track: { id: trackId } } }
            },
            relations: ['upstream', 'upstream.stage', 'upstream.stage.track']
        });

        return !!existingStem;
    }

    async updateJobWithHash(jobId: string, audioHash: string): Promise<StemJob | null> {
        const job = await this.stemJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            return null;
        }

        job.stem_hash = audioHash;
        return await this.stemJobRepository.save(job);
    }

    async deleteJob(jobId: string): Promise<void> {
        await this.stemJobRepository.delete(jobId);
        this.logger.log(`Stem job 삭제 완료: ${jobId}`);
    }

    async convertJobToStem(jobId: string): Promise<Stem | null> {
        const job = await this.stemJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            return null;
        }

        // Stem 엔티티 생성
        const stem = this.stemRepository.create({
            file_name: job.file_name,
            stem_hash: job.stem_hash,
            file_path: job.file_path,
            key: job.key,
            bpm: job.bpm,
            category: { id: job.category_id },
            upstream: { id: job.upstream_id },
            uploaded_at: new Date(),
        });

        const savedStem = await this.stemRepository.save(stem);
        
        // job 삭제
        await this.deleteJob(jobId);
        
        this.logger.log(`Stem job을 Stem으로 변환 완료: ${jobId} -> ${savedStem.id}`);
        return savedStem;
    }

    async requestDeleteDuplicateFile(job: StemJob, userId): Promise<void> {
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

    async sendAudioAnalysisRequest(job: StemJob, userId): Promise<void> {
        // 오디오 분석 요청을 SQS로 보내기
        await this.sqsService.sendAudioAnalysisRequest({
            userId: userId, // 추후 인증 시스템에서 받아올 예정
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
