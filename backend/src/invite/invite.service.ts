import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InviteLink } from './invite.entity';
import { InviteBatch } from './invite-batch.entity';
import { InviteTarget } from './invite-target.entity';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';
import { User } from '../users/user.entity';
import { EmailService } from '../email/email.service';
import { SendInviteDto } from './dto/send-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { DeclineInviteDto } from './dto/decline-invite.dto';


import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InviteService {
    constructor(
        @InjectRepository(InviteLink)
        private inviteRepository: Repository<InviteLink>,
        @InjectRepository(InviteBatch)
        private inviteBatchRepository: Repository<InviteBatch>,
        @InjectRepository(InviteTarget)
        private inviteTargetRepository: Repository<InviteTarget>,
        @InjectRepository(TrackCollaborator)
        private trackCollaboratorRepository: Repository<TrackCollaborator>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private dataSource: DataSource,
        private emailService: EmailService,


    ) {}

    // 기존 메서드(초대 링크 생성 방식 메서드, 일단 걍 냅둠)
    async createInviteLink(trackId: string){
        const result = await this.inviteRepository.findOne({ where: { track: {id: trackId} } });
        if (result) {
          return {success: true, message: 'Invite link already exists', invite: result};
        }
    
        const invite = this.inviteRepository.create({
          track: {id: trackId},
          token: uuidv4(),
          uses: 0,
        });
    
        const savedInvite = await this.inviteRepository.save(invite);
        return {success: true, message: 'Invite link created successfully', invite: savedInvite};
    }

    async getInviteByToken(token: string){
        const invite = await this.inviteRepository.findOne({
          where: { token },
        });
    
        if (!invite) {
          throw new NotFoundException('Invite link not found');
        }
    
        return invite;
    }
    
    async incrementUses(token: string): Promise<void> {
        const invite = await this.getInviteByToken(token);
        invite.uses += 1;
        await this.inviteRepository.save(invite);
    }

    // 새로운 이메일 기반 초대 시스템 //
    
    //이메일 중복 체크 - 실시간 검증용 
    async checkEmailDuplicate(trackId: string, email: string): Promise<{ isDuplicate: boolean; message?: string }> {
        // 1. 이미 협업자인지 체크
        const existingCollaborator = await this.trackCollaboratorRepository
            .createQueryBuilder('tc')
            .leftJoin('tc.user_id', 'user')
            .where('tc.track_id = :trackId', { trackId })
            .andWhere('user.email = :email', { email })
            .getOne();

        if (existingCollaborator) {
            return {
                isDuplicate: true,
                message: '이미 트랙에 참여 중인 사용자입니다.' 
            };
        }

        // 2. 대기 중인 초대가 있는지 체크
        const pendingInvite = await this.inviteTargetRepository
            .createQueryBuilder('it')
            .leftJoin('it.invite_batch', 'ib')
            .where('ib.track_id = :trackId', { trackId })
            .andWhere('it.email = :email', { email })
            .andWhere('it.status = :status', { status: 'pending' })
            .andWhere('ib.status = :batchStatus', { batchStatus: 'active' })
            .andWhere('ib.expires_at > :now', { now: new Date() })
            .getOne();

        if (pendingInvite) {
            return {
                isDuplicate: true,
                message: '이미 초대가 발송된 이메일입니다.'
            };
        }

        return { isDuplicate: false };
    }

    
     //다중 이메일 초대 발송
     async sendInvites(sendInviteDto: SendInviteDto, inviterId: string): Promise<{
        success: boolean;
        message: string;
        batch_id: string;
        sent_count: number;
        failed_emails: string[];
    }> {
        const { track_id, emails } = sendInviteDto;

        // 1. 중복 이메일 필터링
        const validEmails: string[] = [];
        const failedEmails: string[] = [];

        for (const email of emails) {
            const checkResult = await this.checkEmailDuplicate(track_id, email);
            if (checkResult.isDuplicate) {
                failedEmails.push(email);
            } else {
                validEmails.push(email);
            }
        }

        if (validEmails.length === 0) {
            throw new BadRequestException('초대 가능한 이메일이 없습니다.');
        }

        // 2. InviteBatch 생성
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24시간 후 만료

        const inviteBatch = this.inviteBatchRepository.create({
            track: { id: track_id },
            inviter: { id: inviterId },
            expires_at: expiresAt,
            status: 'active'
        });

        const savedBatch = await this.inviteBatchRepository.save(inviteBatch);

        // 3. InviteTarget들 생성
        const inviteTargets = validEmails.map(email => 
            this.inviteTargetRepository.create({
                invite_batch: savedBatch,
                email,
                token: uuidv4(),
                status: 'pending'
            })
        );

        await this.inviteTargetRepository.save(inviteTargets);

        // 4. 이메일 발송
        const emailResults = await Promise.allSettled(
            inviteTargets.map(async (target) => {
                const emailResult = await this.emailService.sendInviteEmail(
                    target.email,
                    {
                        trackName: savedBatch.track.title,
                        inviterName: savedBatch.inviter.username,
                        inviteToken: target.token,
                        expiresAt: savedBatch.expires_at
                    }
                );
                
                if (!emailResult.success) {
                    throw new Error(`Failed to send email to ${target.email}: ${emailResult.error}`);
                }
                
                return target.email;
            })
        );

        // 5. 이메일 전송 실패한 경우 처리
        const emailFailedEmails: string[] = [];
        emailResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                emailFailedEmails.push(inviteTargets[index].email);
            }
        });

        const totalFailedEmails = [...failedEmails, ...emailFailedEmails];
        const successCount = validEmails.length - emailFailedEmails.length;
        
        return {
            success: true,
            message: successCount > 0 
                ? `${successCount}개의 초대장이 발송되었습니다.`
                : '모든 초대장 발송에 실패했습니다.',

            batch_id: savedBatch.id,
            sent_count: successCount,
            failed_emails: totalFailedEmails

        };
    }

    // 토근으로 초대 정보 생성성
    async getInviteByTargetToken(token: string): Promise<InviteTarget> {
        const inviteTarget = await this.inviteTargetRepository.findOne({
            where: { token },
            relations: ['invite_batch', 'invite_batch.track', 'invite_batch.inviter']
        });

        if (!inviteTarget) {
            throw new NotFoundException('초대 링크를 찾을 수 없습니다.');
        }

        // 만료 체크
        if (inviteTarget.invite_batch.isExpired()) {
            throw new BadRequestException('초대 링크가 만료되었습니다. 새로운 초대를 요청해주세요.');
        }

        return inviteTarget;
    }


    // 초대 수락

    async acceptInvite(acceptInviteDto: AcceptInviteDto): Promise<{
        success: boolean;
        message: string;
        user_status: 'existing' | 'new';
        track_id: string;
        redirect_url?: string;
    }> {
        const { token, user_id } = acceptInviteDto;

        return await this.dataSource.transaction(async manager => {
            // 1. 초대 정보 조회 및 검증
            const inviteTarget = await manager.findOne(InviteTarget, {
                where: { token },
                relations: ['invite_batch', 'invite_batch.track', 'invite_batch.inviter']
            });

            if (!inviteTarget) {
                throw new NotFoundException('초대 링크를 찾을 수 없습니다.');
            }

            if (inviteTarget.invite_batch.isExpired()) {
                throw new BadRequestException('초대 링크가 만료되었습니다. 새로운 초대를 요청해주세요.');
            }

            if (inviteTarget.status !== 'pending') {
                throw new BadRequestException('이미 처리된 초대입니다.');
            }

            // 2. 사용자 상태 확인
            const existingUser = await manager.findOne(User, {
                where: { email: inviteTarget.email }
            });

            let userStatus: 'existing' | 'new' = 'new';
            let targetUserId = user_id;

            if (existingUser) {
                userStatus = 'existing';
                targetUserId = existingUser.id;

                // 로그인된 사용자와 초대받은 이메일이 일치하는지 확인
                if (user_id && user_id !== existingUser.id) {
                    throw new BadRequestException('초대받은 이메일과 로그인된 계정이 일치하지 않습니다.');
                }
            }

            // 3. 기존 회원이고 로그인된 경우에만 즉시 협업자 등록
            if (userStatus === 'existing' && targetUserId) {
                // 이미 협업자인지 재확인
                const existingCollaborator = await manager.findOne(TrackCollaborator, {
                    where: {
                        track_id: { id: inviteTarget.invite_batch.track.id },
                        user_id: { id: targetUserId }
                    }
                });

                if (existingCollaborator) {
                    throw new ConflictException('이미 트랙에 참여 중인 사용자입니다.');
                }

                // 협업자 등록
                const collaborator = manager.create(TrackCollaborator, {
                    track_id: { id: inviteTarget.invite_batch.track.id },
                    user_id: { id: targetUserId },
                    role: 'collaborator',
                    status: 'accepted'
                });
                await manager.save(collaborator);

            }

            // 4. 초대 상태 업데이트
            inviteTarget.status = 'accepted';
            inviteTarget.responded_at = new Date();
            await manager.save(inviteTarget);

            // 5. 배치 완료 상태 체크
            await this.checkBatchCompletion(inviteTarget.invite_batch.id, manager);

            // 6. 응답 생성
            const response: {
                success: boolean;
                message: string;
                user_status: 'existing' | 'new';
                track_id: string;
                redirect_url?: string;
            } = {
                success: true,
                message: userStatus === 'existing' 
                    ? '초대를 수락했습니다. 트랙에 참여되었습니다.'
                    : '초대를 수락했습니다. 회원가입을 완료해주세요.',
                user_status: userStatus,
                track_id: inviteTarget.invite_batch.track.id
            };

            // 기존 회원인 경우 리다이렉트 URL 추가
            if (userStatus === 'existing') {
                response.redirect_url = `/tracks/${inviteTarget.invite_batch.track.id}/master`;
            }

            return response;
        });
    }


    /**
     * 초대 거절 처리
     */

    async declineInvite(declineInviteDto: DeclineInviteDto): Promise<{
        success: boolean;
        message: string;
    }> {
        const { token } = declineInviteDto;

        return await this.dataSource.transaction(async manager => {
            // 1. 초대 정보 조회 및 검증
            const inviteTarget = await manager.findOne(InviteTarget, {
                where: { token },
                relations: ['invite_batch']
            });

            if (!inviteTarget) {
                throw new NotFoundException('초대 링크를 찾을 수 없습니다.');
            }

            if (inviteTarget.invite_batch.isExpired()) {
                throw new BadRequestException('초대 링크가 만료되었습니다.');
            }

            if (inviteTarget.status !== 'pending') {
                throw new BadRequestException('이미 처리된 초대입니다.');
            }

            // 2. 초대 상태 업데이트
            inviteTarget.status = 'declined';
            inviteTarget.responded_at = new Date();
            await manager.save(inviteTarget);

            // 3. 배치 완료 상태 체크
            await this.checkBatchCompletion(inviteTarget.invite_batch.id, manager);

            return {
                success: true,
                message: '초대를 거절했습니다.'
            };
        });
    }


    /**
     * 회원가입 완료 후 협업자 등록 처리
     */

    async completeInviteAfterSignup(token: string, userId: string): Promise<{
        success: boolean;
        message: string;
        track_id: string;
    }> {
        return await this.dataSource.transaction(async manager => {
            // 1. 초대 정보 조회
            const inviteTarget = await manager.findOne(InviteTarget, {
                where: { token, status: 'accepted' },
                relations: ['invite_batch', 'invite_batch.track']
            });

            if (!inviteTarget) {
                throw new NotFoundException('유효하지 않은 초대 정보입니다.');
            }

            // 2. 사용자 정보 확인
            const user = await manager.findOne(User, { where: { id: userId } });
            if (!user) {
                throw new NotFoundException('사용자를 찾을 수 없습니다.');
            }

            // 3. 이메일 일치 확인
            if (user.email !== inviteTarget.email) {
                throw new BadRequestException('초대받은 이메일과 가입한 이메일이 일치하지 않습니다.');
            }

            // 4. 협업자 등록
            const collaborator = manager.create(TrackCollaborator, {
                track_id: { id: inviteTarget.invite_batch.track.id },
                user_id: { id: userId },
                role: 'collaborator',
                status: 'accepted'
            });
            await manager.save(collaborator);



            return {
                success: true,
                message: '트랙에 성공적으로 참여했습니다.',
                track_id: inviteTarget.invite_batch.track.id
            };
        });
    }


    /**
     * 배치 완료 상태 체크 및 업데이트
     */

    // 초대 완료 여부 체크

    private async checkBatchCompletion(batchId: string, manager: any): Promise<void> {
        const batch = await manager.findOne(InviteBatch, {
            where: { id: batchId },
            relations: ['targets']
        });

        if (!batch) return;

        // 모든 타겟이 응답했는지 확인
        const allResponded = batch.targets.every(target => 
            target.status === 'accepted' || target.status === 'declined'
        );

        if (allResponded) {
            batch.status = 'completed';
            await manager.save(batch);
        }
    }
}
