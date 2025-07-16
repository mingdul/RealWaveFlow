import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpstreamReview } from './upstream-review.entity';
import { CreateUpstreamReviewDto } from './dto/createUpstreamReview.dto';
import { StageReviewer } from 'src/stage-reviewer/stage-reviewer.entity';
import { Stem } from 'src/stem/stem.entity';
import { Upstream } from 'src/upstream/upstream.entity';
import { UpdateStageDto } from 'src/stage/dto/updateStage.dto';
import { Stage } from 'src/stage/stage.entity';
import { CreateVersionStemDto } from 'src/version-stem/dto/createVersionStem.dto';
import { VersionStem } from 'src/version-stem/version-stem.entity';

@Injectable()
export class UpstreamReviewService {

    constructor(
        @InjectRepository(UpstreamReview)
        private upstreamReviewRepository: Repository<UpstreamReview>,
        @InjectRepository(StageReviewer)
        private stageReviewerRepository: Repository<StageReviewer>,
        @InjectRepository(Stem)
        private stemRepository: Repository<Stem>,
        @InjectRepository(Upstream)
        private upstreamRepository: Repository<Upstream>,
        @InjectRepository(Stage)
        private stageRepository: Repository<Stage>,
        @InjectRepository(VersionStem)
        private versionStemRepository: Repository<VersionStem>,
    ) {}

    async createUpstreamReview(createUpstreamReviewDto: CreateUpstreamReviewDto) {
        const { upstream_id, stage_id } = createUpstreamReviewDto;
        const review_users = await this.stageReviewerRepository.find({
            where: { stage: { id: stage_id } },
        });

        const upstreamReviews = [];
        for(const review_user of review_users) {
                const upstreamReview = this.upstreamReviewRepository.create({
                    upstream: { id: upstream_id },
                    stage_reviewer: { id: review_user.id },
            }); 
            const savedUpstreamReview = await this.upstreamReviewRepository.save(upstreamReview);
            if (!savedUpstreamReview) {
                throw new BadRequestException('Failed to create upstream review');
            }
            upstreamReviews.push(savedUpstreamReview);
        }
        return {
            success: true,
            message: 'Upstream review created successfully',
            data: upstreamReviews,
        };
    }


    async getUpstreamReviews(upstream_id: string) {
        const upstreamReviews = await this.upstreamReviewRepository.find({
            where: { upstream: { id: upstream_id } },
            relations: ['upstream', 'stage_reviewer'],
        });

        if (upstreamReviews.length === 0) {
            throw new NotFoundException('No upstream reviews found');
        }
        return {
            success: true,
            message: 'Upstream reviews fetched successfully',   
            data: upstreamReviews,
        };
    }



    async updateReviewStatus(reviewId: string, upstreamId: string, stageId: string, newStatus: 'approved' | 'rejected') {
        // 리뷰 상태 업데이트
        await this.upstreamReviewRepository.update({ id: reviewId }, { status: newStatus });

        // 모든 리뷰어의 상태 확인
        const allReviews = await this.upstreamReviewRepository.find({
            where: { upstream: { id: upstreamId } },
        });

        const allApproved = allReviews.every(r => r.status === 'approved');
        const hasRejected = allReviews.some(r => r.status === 'rejected');
        const hasPending = allReviews.some(r => r.status === 'pending');

        if (allApproved) {
            await this.upstreamRepository.update({ id: upstreamId }, { status: 'approved' });
            await this.finalizeUpstream(upstreamId);
        } else if (!hasPending && hasRejected) {
            // pending 없이 rejected가 있다면
            await this.upstreamRepository.update({ id: upstreamId }, { status: 'rejected' });
        }

        return {
            success: true,
            message: `Upstream Reviewer ${newStatus} successfully`,
            data: { reviewId, newStatus, upstreamId }
        };
    }

    async finalizeUpstream(upstreamId: string) {
        try {
          // 1. upstream 정보 로딩 (stems, stage, user 포함)
          const upstream = await this.upstreamRepository.findOne({
            where: { id: upstreamId },
            relations: ['stems', 'stage', 'user', 'stems.category'],
          });
      
          if (!upstream || !upstream.stage) {
            throw new NotFoundException('Upstream or associated Stage not found');
          }
      
          const stage = upstream.stage;
      
          // 2. stage.guide_path 업데이트
          await this.stageRepository.update(
            { id: stage.id },
            { guide_path: upstream.guide_path , status: 'approve' }
          );
      

          const stems = await this.stemRepository.find({
            where: { upstream: {id: upstreamId}},
            relations: ['category', 'user', 'upstream'],
          });

          if(stems.length === 0){
            throw new NotFoundException('No stems found');
          }

          // 3. upstream.stems를 version_stems로 복사
          for (const stem of stems) {
            const createDto: CreateVersionStemDto = {
              version : stage.version,
              stem_hash: stem.stem_hash,
              file_path: stem.file_path,
              file_name: stem.file_name,
              key: stem.key,
              bpm: stem.bpm,
              audio_wave_path: stem.audio_wave_path,
              user_id: upstream.user.id,
              category_id: stem.category.id,
              stage_id: stage.id,
              track_id: upstream.stage.track.id,
            };
      
            await this.versionStemRepository.save(createDto);
          }
      
          return {
            success: true,
            message: 'Upstream finalized: guide applied and version_stems created',
            data: {
              upstreamId,
              stageId: stage.id,
              versionStemCount: stems.length,
            },
          };
        } catch (error) {
          throw error;
        }
      }

    async approveDropReviewer(stageId: string, upstreamId: string, userId: string) {
        const review_user = await this.stageReviewerRepository.findOne({
            where: { stage: {id: stageId}, user: {id: userId}},
        });
        
        if(!review_user){
            return {success: false, message: 'Have no control over the stage'};
        }

        const upstreamReviewer = await this.upstreamReviewRepository.findOne({
            where: {upstream: {id: upstreamId}, stage_reviewer: {id: review_user.id}},
        });

        if(!upstreamReviewer){
            return {success: false, message: 'Have no control over the upstream'};
        }

        return this.updateReviewStatus(upstreamReviewer.id, upstreamId, stageId, 'approved');
    }

    async rejectDropReviewer(stageId: string, upstreamId: string, userId: string) {
        const review_user = await this.stageReviewerRepository.findOne({
            where: { stage: {id: stageId}, user: {id: userId}},
        });
        
        if(!review_user){
            return {success: false, message: 'Have no control over the stage'};
        }
        const upstreamReviewer = await this.upstreamReviewRepository.findOne({
            where: {upstream: {id: upstreamId}, stage_reviewer: {id: review_user.id}},
        });


        
        if(!upstreamReviewer){
            return {success: false, message: 'Have no control over the upstream'};
        }

        return this.updateReviewStatus(upstreamReviewer.id, upstreamId, stageId, 'rejected');
    }       
    
}
