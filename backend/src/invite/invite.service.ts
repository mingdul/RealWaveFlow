import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InviteLink } from './invite.entity';
import { InviteBatch } from './invite-batch.entity';
import { InviteTarget } from './invite-target.entity';
import { Track } from 'src/track/track.entity';
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

    // 기존 초대 링크 생성
    async createInviteLink(trackId: string){
        const inviteLink = this.inviteRepository.create({
            track: { id: trackId },
            token: uuidv4(),
            uses: 0
        });

        return await this.inviteRepository.save(inviteLink);
    }

    // 토큰으로 초대 정보 조회
    async getInviteByToken(token: string){
        const inviteLink = await this.inviteRepository.findOne({
            where: { token },
            relations: ['track']
        });

        if (!inviteLink) {
            throw new NotFoundException('초대 링크를 찾을 수 없습니다.');
        }

        return inviteLink;
    }

    // 사용 횟수 증가
    async incrementUses(token: string): Promise<void> {
        await this.inviteRepository.increment({ token }, 'uses', 1);
    }

    // 이메일 중복 체크
    async checkEmailDuplicate(trackId: string, email: string): Promise<{ isDuplicate: boolean; message?: string }> {
        // 1. 해당 트랙의 소유자 이메일 체크
        const track = await this.inviteRepository.manager.findOne(Track, {
            where: { id: trackId },
            relations: ['owner_id']
        });

        if (track?.owner_id?.email === email) {
            return {
                isDuplicate: true,
                message: '트랙 소유자는 초대할 수 없습니다.'
            };
        }

        // 2. 이미 협업자인지 체크
        const existingCollaborator = await this.trackCollaboratorRepository.findOne({
            where: {
                track_id: { id: trackId },
                user_id: { email: email }
            },
            relations: ['user_id']
        });

        if (existingCollaborator) {
            return {
                isDuplicate: true,
                message: '이미 트랙에 참여 중인 사용자입니다.'
            };
        }

        // 3. 이미 초대된 이메일인지 체크 (pending 상태)
        const existingInvite = await this.inviteTargetRepository.findOne({
            where: {
                email: email,
                status: 'pending',
                invite_batch: {
                    track: { id: trackId }
                }
            },
            relations: ['invite_batch']
        });

        if (existingInvite) {
            return {
                isDuplicate: true,
                message: '이미 초대된 이메일입니다.'
            };
        }

        return { isDuplicate: false };
    }

    // 다중 이메일 초대 발송
    async sendInvites(sendInviteDto: SendInviteDto, inviterId: string): Promise<{
        success: boolean;
        message: string;
        batch_id: string;
        sent_count: number;
        failed_emails: string[];
    }> {
        const { trackId, emails, expiresInDays = 7 } = sendInviteDto;

        // 1. 트랙 소유자 확인
        const track = await this.inviteRepository.manager.findOne(Track, {
            where: { id: trackId },
            relations: ['owner_id']
        });

        if (!track) {
            throw new NotFoundException('트랙을 찾을 수 없습니다.');
        }

        if (track.owner_id.id !== inviterId) {
            throw new BadRequestException('트랙 소유자만 초대를 발송할 수 있습니다.');
        }

        // 2. 이메일 유효성 검사 및 중복 체크
        const validEmails: string[] = [];
        const failedEmails: string[] = [];

        for (const email of emails) {
            const duplicateCheck = await this.checkEmailDuplicate(trackId, email);
            if (duplicateCheck.isDuplicate) {
                failedEmails.push(email);
            } else {
                validEmails.push(email);
            }
        }

        if (validEmails.length === 0) {
            return {
                success: false,
                message: '유효한 이메일이 없습니다.',
                batch_id: '',
                sent_count: 0,
                failed_emails: failedEmails
            };
        }

        // 3. 초대 배치 생성
        const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
        const savedBatch = await this.inviteBatchRepository.save({
            track: { id: trackId },
            inviter: { id: inviterId },
            expires_at: expiresAt
        });

        // 4. 초대 대상 생성 및 이메일 발송
        const inviteTargets = validEmails.map(email => ({
            email,
            token: uuidv4(),
            status: 'pending' as const,
            invite_batch: { id: savedBatch.id }
        }));

        const savedTargets = await this.inviteTargetRepository.save(inviteTargets);

        const emailResults = await Promise.allSettled(
            savedTargets.map(async (target) => {
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

                // TODO: Session 엔티티가 없어서 임시로 주석 처리
                // 개인 세션 생성
                // const session = manager.create(Session, {
                //     track: { id: inviteTarget.invite_batch.track.id },
                //     user: { id: targetUserId },
                //     name: `${existingUser.username}'s Session`,
                //     description: '개인 작업 세션'
                // });
                // await manager.save(session);
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
     * 회원가입 완료 후 협업자 등록
     */
    async completeInviteAfterSignup(token: string, userId: string): Promise<{
        success: boolean;
        message: string;
        track_id: string;
    }> {
        return await this.dataSource.transaction(async manager => {
            // 1. 초대 정보 조회
            const inviteTarget = await manager.findOne(InviteTarget, {
                where: { token },
                relations: ['invite_batch']
            });

            if (!inviteTarget) {
                throw new NotFoundException('초대 링크를 찾을 수 없습니다.');
            }

            if (inviteTarget.status !== 'accepted') {
                throw new BadRequestException('수락되지 않은 초대입니다.');
            }

            // 2. 사용자 정보 조회
            const user = await manager.findOne(User, {
                where: { id: userId }
            });

            if (!user) {
                throw new NotFoundException('사용자를 찾을 수 없습니다.');
            }

            // 3. 이미 협업자인지 확인
            const existingCollaborator = await manager.findOne(TrackCollaborator, {
                where: {
                    track_id: { id: inviteTarget.invite_batch.track.id },
                    user_id: { id: userId }
                }
            });

            if (existingCollaborator) {
                return {
                    success: true,
                    message: '이미 트랙에 참여 중입니다.',
                    track_id: inviteTarget.invite_batch.track.id
                };
            }

            // 4. 협업자 등록
            const collaborator = manager.create(TrackCollaborator, {
                track_id: { id: inviteTarget.invite_batch.track.id },
                user_id: { id: userId },
                role: 'collaborator',
                status: 'accepted'
            });
            await manager.save(collaborator);

            // TODO: Session 엔티티가 없어서 임시로 주석 처리
            // 5. 개인 세션 생성
            // const session = manager.create(Session, {
            //     track: { id: inviteTarget.invite_batch.track.id },
            //     user: { id: userId },
            //     name: `${user.username}'s Session`,
            //     description: '개인 작업 세션'
            // });
            // await manager.save(session);

            return {
                success: true,
                message: '트랙에 성공적으로 참여했습니다.',
                track_id: inviteTarget.invite_batch.track.id
            };
        });
    }

    /**
     * 배치 완료 상태 체크
     */
    private async checkBatchCompletion(batchId: string, manager: any): Promise<void> {
        const pendingInvites = await manager.count(InviteTarget, {
            where: {
                invite_batch: { id: batchId },
                status: 'pending'
            }
        });

        if (pendingInvites === 0) {
            // 모든 초대가 처리되었으므로 배치 상태를 completed로 업데이트
            await manager.update(InviteBatch, { id: batchId }, { 
                status: 'completed'
            });
        }
    }
}
