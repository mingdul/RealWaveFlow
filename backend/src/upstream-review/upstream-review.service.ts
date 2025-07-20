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
import { Track } from 'src/track/track.entity';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { DataSource } from 'typeorm';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
@Injectable()
export class UpstreamReviewService {
    private readonly s3: S3Client;
    private readonly bucketName: string;

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
        @InjectRepository(Track)
        private trackRepository: Repository<Track>,
        private notificationGateway: NotificationGateway,
        private dataSource: DataSource,
    ) {
        this.s3 = new S3Client({
            region: process.env.AWS_REGION,
        });
        this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'waveflow-bucket';
    }

    private async generatePresignedUrl(imageKey: string): Promise<string | null> {
        if (!imageKey) {
            return null;
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: imageKey,
            });

            const presignedUrl = await getSignedUrl(this.s3, command, {
                expiresIn: 3600 // 1시간
            });

            return presignedUrl;
        } catch (error) {
            console.error('Error generating presigned URL for key:', imageKey, error);
            return null;
        }
    }

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

        return {
            success: true,
            message: upstreamReviews.length > 0 ? 'Upstream reviews fetched successfully' : 'No upstream reviews found',   
            data: upstreamReviews,
        };
    }

    async getUpstreamReviewsWithReviewers(upstream_id: string) {
        const upstreamReviews = await this.upstreamReviewRepository.find({
            where: { upstream: { id: upstream_id } },
            relations: ['upstream', 'stage_reviewer', 'stage_reviewer.user', 'stage_reviewer.stage', 'stage_reviewer.stage.track'],
        });

        if (upstreamReviews.length === 0) {
            return {
                success: true,
                message: 'No upstream reviews found',
                data: [],
            };
        }

        // 각 리뷰에 대해 리뷰어 정보와 presigned URL 추가
        const reviewsWithDetails = await Promise.all(
            upstreamReviews.map(async (review) => {
                // Track collaborator 정보 조회 (역할 정보를 위해)
                const trackCollaborator = await this.trackCollaboratorRepository.findOne({
                    where: {
                        user_id: { id: review.stage_reviewer.user.id },
                        track_id: { id: review.stage_reviewer.stage.track.id }
                    }
                });

                // Presigned URL 생성
                const imageUrl = await this.generatePresignedUrl(review.stage_reviewer.user.image_url);

                return {
                    id: review.id,
                    status: review.status,
                    reviewer: {
                        id: review.stage_reviewer.user.id,
                        username: review.stage_reviewer.user.username,
                        email: review.stage_reviewer.user.email,
                        image_url: imageUrl,
                        role: trackCollaborator?.role || 'Collaborator',
                    },
                    upstream: {
                        id: review.upstream.id
                    }
                };
            })
        );

        return {
            success: true,
            message: 'Upstream reviews with reviewers fetched successfully',
            data: reviewsWithDetails,
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
              console.log(`🔔 [UpstreamReview] Starting version creation notification process...`);
              console.log(`🔔 [UpstreamReview] Track ID: ${upstream.stage.track.id}`);
              console.log(`🔔 [UpstreamReview] Track Title: ${upstream.stage.track.title}`);
              console.log(`🔔 [UpstreamReview] Stage ID: ${upstream.stage.id}`);
              console.log(`🔔 [UpstreamReview] Stage Version: ${upstream.stage.version}`);
              
              // 트랙 정보 다시 조회 (owner 포함)
              const trackWithOwner = await this.trackRepository.findOne({
                where: { id: upstream.stage.track.id },
                relations: ['owner_id'],
              });

              if (!trackWithOwner) {
                console.error(`🔔 [UpstreamReview] ❌ Track not found: ${upstream.stage.track.id}`);
                return;
              }

              console.log(`🔔 [UpstreamReview] Track Owner ID: ${trackWithOwner.owner_id?.id}`);
              
              // 트랙 collaborators 조회
              const trackCollaborators = await this.trackCollaboratorRepository.find({
                where: { 
                  track_id: { id: upstream.stage.track.id },
                  status: 'accepted' // 승인된 멤버들만
                },
                relations: ['user_id'],
              });

              console.log(`🔔 [UpstreamReview] Found ${trackCollaborators.length} track collaborators`);

              // 알림을 받을 사용자 ID 목록 생성 (트랙 owner + collaborators)
              const memberUserIds: string[] = [];
              
              // 트랙 owner 추가
              if (trackWithOwner.owner_id?.id) {
                memberUserIds.push(trackWithOwner.owner_id.id);
                console.log(`🔔 [UpstreamReview] Added track owner: ${trackWithOwner.owner_id.id}`);
              }
              
              // collaborators 추가 (owner와 중복 제거)
              trackCollaborators.forEach(collab => {
                if (collab.user_id?.id && !memberUserIds.includes(collab.user_id.id)) {
                  memberUserIds.push(collab.user_id.id);
                  console.log(`🔔 [UpstreamReview] Added collaborator: ${collab.user_id.id}`);
                }
              });

              console.log(`🔔 [UpstreamReview] Final member user IDs:`, memberUserIds);
              
              if (memberUserIds.length > 0) {
                const trackName = upstream.stage.track.title || '트랙';
                const stageVersion = upstream.stage.version ? `버전 ${upstream.stage.version}` : '새 버전';
                
                console.log(`🔔 [UpstreamReview] Sending notification for track: "${trackName}", version: "${stageVersion}"`);
                
                // 알림 데이터 준비
                const notificationData = {
                  trackId: upstream.stage.track.id,
                  stageId: upstream.stage.id,
                  upstreamId: upstreamId,
                  trackName: trackName,
                  stageVersion: stageVersion,
                  trackTitle: trackName, // 추가 호환성
                  stageTitle: upstream.stage.title || stageVersion,
                };

                console.log(`🔔 [UpstreamReview] Notification data:`, JSON.stringify(notificationData, null, 2));
                
                await this.notificationGateway.sendNotificationToUsers(
                  memberUserIds,
                  'version_created',
                  `🆕 ${trackName}의 새로운 버전 "${stageVersion}"이 생성되었습니다!`,
                  notificationData
                );

                console.log(`🔔 [UpstreamReview] ✅ Successfully sent version creation notification to ${memberUserIds.length} track members`);
              } else {
                console.log(`🔔 [UpstreamReview] ⚠️ No track members found to notify`);
                console.log(`🔔 [UpstreamReview] Track owner exists: ${!!trackWithOwner.owner_id?.id}`);
                console.log(`🔔 [UpstreamReview] Collaborators count: ${trackCollaborators.length}`);
              }
            } catch (error) {
              console.error('🔔 [UpstreamReview] ❌ Failed to send version creation notification:', error);
              console.error('🔔 [UpstreamReview] Error details:', {
                message: error.message,
                stack: error.stack,
                trackId: upstream?.stage?.track?.id,
                upstreamId: upstreamId,
                stageId: upstream?.stage?.id
              });
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
