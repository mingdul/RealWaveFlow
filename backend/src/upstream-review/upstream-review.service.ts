import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpstreamReview } from './upstream-review.entity';
import { CreateUpstreamReviewDto } from './dto/createUpstreamReview.dto';
import { StageReviewer } from 'src/stage-reviewer/stage-reviewer.entity';

@Injectable()
export class UpstreamReviewService {

    constructor(
        @InjectRepository(UpstreamReview)
        private upstreamReviewRepository: Repository<UpstreamReview>,
        @InjectRepository(StageReviewer)
        private stageReviewerRepository: Repository<StageReviewer>,
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



    // async updateReviewStatus(reviewId: string, newStatus: 'approved' | 'rejected') {
    //     // 리뷰 상태 업데이트
    //     await this.upstreamReviewRepository.update({ id: reviewId }, { status: newStatus });

    //     // 해당 review의 drop_id를 조회
    //     const review = await this.upstreamReviewRepository.findOne({
    //         where: { id: reviewId },
    //         relations: ['upstream'],
    //     });
        
    //     if (!review) {
    //         throw new NotFoundException('Review not found');
    //     }
        
    //     const upstreamId = review.upstream.id;

    //     // 모든 리뷰어의 상태 확인
    //     const allReviews = await this.upstreamReviewRepository.find({
    //         where: { upstream: { id: upstreamId } },
    //     });

    //     const allApproved = allReviews.every(r => r.status === 'approved');
    //     const hasRejected = allReviews.some(r => r.status === 'rejected');
    //     const hasPending = allReviews.some(r => r.status === 'pending');

    //     if (allApproved) {
    //         await this.upstreamRepository.update({ id: upstreamId }, { status: 'approved' });
    //         await this.finalizeUpstream(upstreamId);
    //     } else if (!hasPending && hasRejected) {
    //         // pending 없이 rejected가 있다면
    //         await this.upstreamRepository.update({ id: upstreamId }, { status: 'rejected' });
    //     }

       

    //     return {
    //         success: true,
    //         message: `Drop Reviewer ${newStatus} successfully`,
    //         data: { reviewId, newStatus, upstreamId }
    //     };
    // }

    // async finalizeDrop(dropId: string) {
    //     try {
    //         // drop → dropSelections → stem_file 가져오기
    //         const upstreamSelections = await this.upstreamSelectionRepository.find({
    //             where: { upstream: { id: upstreamId } },
    //             relations: ['stem_file', 'stem_file.category'],
    //         });

    //         const upstream = await this.upstreamRepository.findOne({
    //             where: { id: upstreamId },
    //             relations: ['track', 'drop_by'],
    //         });

    //         if (!upstream) {
    //             throw new NotFoundException('Upstream not found');
    //         }

            
    //         const createMasterTakeDto: CreateMasterTakeDto = {
    //             track_id: drop.track.id
    //         };
            
    //         const masterTakeResult = await this.masterTakeService.createMasterTake(
    //             createMasterTakeDto, 
    //             drop.drop_by.id
    //         );
            
    //         const masterTake = masterTakeResult.data;

            
    //         for (const sel of dropSelections) {
    //             const stemFile = sel.stem_file;
    //             if (stemFile && stemFile.category) {
    //                 const createMasterStemDto: CreateMasterStemDto = {
    //                     file_path: stemFile.file_path,
    //                     file_name: stemFile.file_name,
    //                     key: stemFile.key,
    //                     tag: stemFile.tag,
    //                     description: stemFile.description,
    //                     take: masterTake.take,
    //                     track_id: drop.track.id,
    //                     category_id: stemFile.category.id,
    //                     masterTake_id: masterTake.id,
    //                     uploaded_by: drop.drop_by.id,
    //                 };
                    
    //                 await this.masterStemService.createMasterStem(createMasterStemDto);
    //             }
    //         }

    //         return {
    //             success: true,
    //             message: 'Drop finalized successfully with MasterTake and MasterStems created',
    //             data: {
    //                 dropId,
    //                 masterTakeId: masterTake.id,
    //                 takeNumber: masterTake.take,
    //                 stemsCreated: dropSelections.length
    //             }
    //         };

    //     } catch (error) {
    //         throw error;
    //     }
    // }

    // async approveDropReviewer(dropId: string, userId: string) {
    //     const upstreamReviewer = await this.upstreamReviewRepository.findOne({
    //         where: {upstream: {id: upstreamId}, user: {id: userId}},
    //     });

    //     if(!upstreamReviewer){
    //         return {success: false, message: 'Have no control over the upstream'};
    //     }

    //     return this.updateReviewStatus(upstreamReviewer.id, 'approved');
    // }

    // async rejectDropReviewer(dropId: string, userId: string) {
    //     const upstreamReviewer = await this.upstreamReviewRepository.findOne({
    //         where: {upstream: {id: upstreamId}, user: {id: userId}},
    //     });
        
    //     if(!upstreamReviewer){
    //         return {success: false, message: 'Have no control over the upstream'};
    //     }

    //     return this.updateReviewStatus(upstreamReviewer.id, 'rejected');
    // }       
    
}
