import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UpstreamReview } from './upstream-review.entity';
import { CreateUpstreamReviewDto } from './dto/createUpstreamReview.dto';
import { StageReviewer } from 'src/stage-reviewer/stage-reviewer.entity';
import { Stem } from 'src/stem/stem.entity';
import { Upstream } from 'src/upstream/upstream.entity';
import { UpdateStageDto } from 'src/stage/dto/updateStage.dto';
import { Stage } from 'src/stage/stage.entity';
import { CreateVersionStemDto } from 'src/version-stem/dto/createVersionStem.dto';
import { VersionStem } from 'src/version-stem/version-stem.entity';
import { TrackCollaborator } from 'src/track_collaborator/track_collaborator.entity';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { DataSource } from 'typeorm';
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
        @InjectRepository(TrackCollaborator)
        private trackCollaboratorRepository: Repository<TrackCollaborator>,
        private notificationGateway: NotificationGateway,
        private dataSource: DataSource,
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



    async updateReviewStatus(
        reviewId: string,
        upstreamId: string,
        stageId: string,
        newStatus: 'approved' | 'rejected',
      ) {
        // 1) 리뷰 상태만 업데이트
        await this.upstreamReviewRepository.update({ id: reviewId }, { status: newStatus });
    
        // 2) 모든 리뷰어 상태 확인
        const allReviews = await this.upstreamReviewRepository.find({ where: { upstream: { id: upstreamId } } });
        const allApproved = allReviews.every(r => r.status === 'approved');
        const hasRejected = allReviews.some(r => r.status === 'rejected');
        const hasPending = allReviews.some(r => r.status === 'pending');

        // 알림 전송을 위해 upstream 정보 미리 로드
        const upstream = await this.upstreamRepository.findOne({
          where: { id: upstreamId },
          relations: ['user', 'stage', 'stage.track'],
        });

        if (!upstream) {
          throw new NotFoundException('Upstream not found');
        }
    
        // 3) 트랜잭션 안에서 업스트림 & finalize 처리
        await this.dataSource.transaction(async manager => {
          if (allApproved) {
            // Upstream 상태 Approved로 업데이트
            await manager.update(Upstream, { id: upstreamId }, { status: 'APPROVED' });
            
            // finalize(guide_path 반영 + version_stem 생성)
            await this.finalizeUpstream(upstreamId, manager);

            // 🔔 알림 1: 트랙의 모든 멤버에게 "새 버전 생성" 알림 전송
            try {
              const trackCollaborators = await this.trackCollaboratorRepository.find({
                where: { 
                  track_id: { id: upstream.stage.track.id },
                  status: 'accepted' // 승인된 멤버들만
                },
                relations: ['user_id'],
              });

              const memberUserIds = trackCollaborators.map(collab => collab.user_id.id);
              
              if (memberUserIds.length > 0) {
                const trackName = upstream.stage.track.title || '트랙';
                const stageVersion = upstream.stage.version || `버전 ${upstream.stage.version}`;
                
                await this.notificationGateway.sendNotificationToUsers(
                  memberUserIds,
                  'version_created',
                  `🆕 ${trackName}의 새로운 버전 "${stageVersion}"이 생성되었습니다!`,
                  {
                    trackId: upstream.stage.track.id,
                    stageId: upstream.stage.id,
                    upstreamId: upstreamId,
                    trackName: trackName,
                    stageVersion: stageVersion,
                  }
                );

                console.log(`🔔 [UpstreamReview] Sent version creation notification to ${memberUserIds.length} track members`);
              }
            } catch (error) {
              console.error('🔔 [UpstreamReview] Failed to send version creation notification:', error);
              // 알림 실패해도 비즈니스 로직은 계속 진행
            }

          } else if (!hasPending && hasRejected) {
            // 모두 완료(pending 없음)이고 하나라도 rejected
            await manager.update(Upstream, { id: upstreamId }, { status: 'REJECTED' });

            // 🔔 알림 2: 업로더에게만 "리뷰 거절" 알림 전송  
            try {
              const uploaderUserId = upstream.user.id;
              const trackName = upstream.stage.track.title || '트랙';
              const stageName = upstream.stage.title || `버전 ${upstream.stage.version}`;

              await this.notificationGateway.sendNotificationToUser(
                uploaderUserId,
                'review_rejected',
                `❌ ${trackName}의 "${stageName}" 업스트림이 리뷰에서 거절되었습니다.`,
                {
                  trackId: upstream.stage.track.id,
                  stageId: upstream.stage.id,
                  upstreamId: upstreamId,
                  trackName: trackName,
                  stageName: stageName,
                }
              );

              console.log(`🔔 [UpstreamReview] Sent review rejection notification to uploader: ${uploaderUserId}`);
            } catch (error) {
              console.error('🔔 [UpstreamReview] Failed to send review rejection notification:', error);
              // 알림 실패해도 비즈니스 로직은 계속 진행
            }
          }
        });
    
        return { success: true, message: `Upstream Reviewer ${newStatus} successfully` };
      }
    
      private async finalizeUpstream(
        upstreamId: string,
        manager: EntityManager,
      ) {
        // 반드시 stage.track 관계까지 한 번에 로딩
        const upstream = await manager.findOne(Upstream, {
          where: { id: upstreamId },
          relations: [
            'stems',
            'stems.category',
            'user',
            'stage',
            'stage.track',       // ← 여기 추가
          ],
        });
        if (!upstream) {
          throw new NotFoundException('Upstream not found');
        }
        const { stage, user, stems, guide_path } = upstream;
        if (!stage) {
          throw new NotFoundException('Associated stage not found');
        }
        if (!stems || stems.length === 0) {
          throw new NotFoundException('No stems to finalize');
        }
    
        // 1) 스테이지에 guide_path & 상태 적용
        await manager.update(Stage, { id: stage.id }, {
          guide_path,
          status: 'APPROVED',      // or your enum value
        });
    
        // 2) 각 stem → version_stem 저장
        for (const stem of stems) {
          await manager.insert(VersionStem, {
            version        : stage.version,
            stem_hash      : stem.stem_hash,
            file_path      : stem.file_path,
            file_name      : stem.file_name,
            key            : stem.key,
            bpm            : stem.bpm,
            audio_wave_path: stem.audio_wave_path,
            user           : user,
            category       : stem.category,
            stage          : stage,
            track          : stage.track,
            uploaded_at    : new Date(),
          });
        }

        // 알림 track 사용자에게
      }
    
      async approveDropReviewer(stageId: string, upstreamId: string, userId: string) {
        const reviewer = await this.stageReviewerRepository.findOne({
          where: { stage: { id: stageId }, user: { id: userId } },
        });
        if (!reviewer) {
          throw new ForbiddenException('No permission on this stage');
        }
        const review = await this.upstreamReviewRepository.findOne({
          where: { upstream: { id: upstreamId }, stage_reviewer: { id: reviewer.id } },
        });
        if (!review) {
          throw new NotFoundException('No upstream review record');
        }
        return this.updateReviewStatus(review.id, upstreamId, stageId, 'approved');
      }
    
      async rejectDropReviewer(stageId: string, upstreamId: string, userId: string) {
        const reviewer = await this.stageReviewerRepository.findOne({
          where: { stage: { id: stageId }, user: { id: userId } },
        });
        if (!reviewer) {
          throw new ForbiddenException('No permission on this stage');
        }
        const review = await this.upstreamReviewRepository.findOne({
          where: { upstream: { id: upstreamId }, stage_reviewer: { id: reviewer.id } },
        });
        if (!review) {
          throw new NotFoundException('No upstream review record');
        }
        return this.updateReviewStatus(review.id, upstreamId, stageId, 'rejected');
      }
    
}
