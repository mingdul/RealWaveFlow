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

/**
 * 초대 서비스
 * 
 * WaveFlow 플랫폼의 트랙 협업 초대 기능을 담당하는 서비스
 * 이메일 기반 초대 시스템과 링크 기반 초대 시스템을 모두 지원
 * 
 * 주요 기능:
 * - 다중 이메일 초대 발송 (배치 처리)
 * - 초대 링크 생성 및 관리
 * - 초대 수락/거절 처리
 * - 이메일 중복 체크
 * - 초대 상태 추적 및 관리
 * - 협업자 자동 등록
 * 
 * 엔티티 관계:
 * - InviteBatch: 초대 배치 (여러 명에게 동시 초대)
 * - InviteTarget: 개별 초대 대상자
 * - InviteLink: 공개 초대 링크 (기존 시스템)
 * - Track: 초대 대상 트랙
 * - User: 초대자 및 초대받은 사용자
 * - TrackCollaborator: 협업자 관계
 * 
 * 워크플로우:
 * 1. 트랙 소유자가 이메일 목록으로 초대 발송
 * 2. 시스템이 각 이메일에 대해 중복 체크 수행
 * 3. 유효한 이메일에 대해 초대 배치 및 개별 초대 생성
 * 4. 이메일 서비스를 통해 초대 이메일 발송
 * 5. 수신자가 초대 링크를 통해 수락/거절
 * 6. 수락 시 협업자로 자동 등록
 */
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

    /**
     * 기존 초대 링크 생성
     * 
     * 공개 초대 링크를 생성합니다. 이는 기존 시스템과의 호환성을 위한 기능입니다.
     * 
     * 워크플로우:
     * 1. 고유한 토큰 생성 (UUID v4)
     * 2. 트랙과 연결된 초대 링크 엔티티 생성
     * 3. 데이터베이스에 저장
     * 
     * @param trackId - 초대 대상 트랙 ID
     * @returns 생성된 초대 링크 엔티티
     * 
     * 사용 예시:
     * - 트랙 소유자가 공개 초대 링크 생성
     * - 소셜 미디어에 공유 가능한 링크
     * - 특정 사용자에게 직접 전달
     */
    async createInviteLink(trackId: string){
        const inviteLink = this.inviteRepository.create({
            track: { id: trackId },
            token: uuidv4(),
            uses: 0
        });

        return await this.inviteRepository.save(inviteLink);
    }

    /**
     * 토큰으로 초대 정보 조회
     * 
     * 초대 토큰을 사용하여 초대 링크 정보를 조회합니다.
     * 
     * @param token - 초대 토큰
     * @returns 초대 링크 엔티티 (트랙 정보 포함)
     * @throws NotFoundException - 초대 링크를 찾을 수 없는 경우
     */
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

    /**
     * 사용 횟수 증가
     * 
     * 초대 링크의 사용 횟수를 1 증가시킵니다.
     * 
     * @param token - 초대 토큰
     */
    async incrementUses(token: string): Promise<void> {
        await this.inviteRepository.increment({ token }, 'uses', 1);
    }

    /**
     * 이메일 중복 체크
     * 
     * 특정 트랙에 대한 이메일 초대의 중복 여부를 확인합니다.
     * 
     * 검증 항목:
     * 1. 트랙 소유자 이메일 체크 (소유자는 초대 불가)
     * 2. 이미 협업자인지 체크
     * 3. 이미 초대된 이메일인지 체크 (pending 상태)
     * 
     * @param trackId - 트랙 ID
     * @param email - 체크할 이메일 주소
     * @returns 중복 여부와 메시지
     * 
     * 반환값:
     * - isDuplicate: 중복 여부 (true/false)
     * - message: 중복인 경우 이유 설명
     */
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

    /**
     * 다중 이메일 초대 발송
     * 
     * 여러 이메일 주소로 동시에 초대를 발송하는 메인 기능입니다.
     * 
     * 워크플로우:
     * 1. 트랙 소유자 권한 확인
     * 2. 각 이메일에 대한 중복 체크 수행
     * 3. 유효한 이메일만 필터링
     * 4. 초대 배치 생성 (만료 시간 설정)
     * 5. 각 이메일에 대해 개별 초대 대상 생성
     * 6. 이메일 서비스를 통한 초대 이메일 발송
     * 7. 발송 결과 집계 및 반환
     * 
     * @param sendInviteDto - 초대 발송 데이터
     * @param sendInviteDto.trackId - 초대 대상 트랙 ID
     * @param sendInviteDto.emails - 초대할 이메일 목록
     * @param sendInviteDto.expiresInDays - 만료 기간 (일, 기본값: 7일)
     * @param inviterId - 초대자 ID (JWT에서 추출)
     * 
     * @returns 초대 발송 결과
     * - success: 전체 성공 여부
     * - message: 결과 메시지
     * - batch_id: 생성된 배치 ID
     * - sent_count: 성공적으로 발송된 이메일 수
     * - failed_emails: 실패한 이메일 목록
     * 
     * 에러 처리:
     * - 트랙을 찾을 수 없는 경우
     * - 트랙 소유자가 아닌 경우
     * - 모든 이메일이 중복인 경우
     * - 이메일 발송 실패
     */
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

    /**
     * 토큰으로 초대 정보 조회
     * 
     * 초대 토큰을 사용하여 개별 초대 대상 정보를 조회합니다.
     * 
     * @param token - 초대 토큰
     * @returns 초대 대상 엔티티 (배치, 트랙, 초대자 정보 포함)
     * @throws NotFoundException - 초대를 찾을 수 없는 경우
     * @throws BadRequestException - 초대가 만료된 경우
     */
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

    /**
     * 초대 수락 처리
     * 
     * 사용자가 초대를 수락했을 때의 처리 로직입니다.
     * 
     * 워크플로우:
     * 1. 초대 정보 조회 및 유효성 검증
     * 2. 사용자 상태 확인 (기존 회원/신규 회원)
     * 3. 기존 회원이고 로그인된 경우 즉시 협업자 등록
     * 4. 초대 상태를 'accepted'로 업데이트
     * 5. 배치 완료 상태 체크
     * 6. 응답 데이터 생성
     * 
     * @param acceptInviteDto - 초대 수락 데이터
     * @param acceptInviteDto.token - 초대 토큰
     * @param acceptInviteDto.user_id - 로그인된 사용자 ID (선택적)
     * 
     * @returns 초대 수락 결과
     * - success: 성공 여부
     * - message: 결과 메시지
     * - user_status: 사용자 상태 ('existing' | 'new')
     * - track_id: 트랙 ID
     * - redirect_url: 리다이렉트 URL (기존 회원인 경우)
     * 
     * 사용자 상태별 처리:
     * - existing: 기존 회원, 즉시 협업자 등록
     * - new: 신규 회원, 회원가입 완료 후 협업자 등록 필요
     * 
     * 에러 처리:
     * - 초대를 찾을 수 없는 경우
     * - 초대가 만료된 경우
     * - 이미 처리된 초대인 경우
     * - 이메일과 로그인 계정이 일치하지 않는 경우
     * - 이미 협업자인 경우
     */
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
     * 
     * 사용자가 초대를 거절했을 때의 처리 로직입니다.
     * 
     * 워크플로우:
     * 1. 초대 정보 조회 및 유효성 검증
     * 2. 초대 상태를 'declined'로 업데이트
     * 3. 응답 시간 기록
     * 4. 배치 완료 상태 체크
     * 
     * @param declineInviteDto - 초대 거절 데이터
     * @param declineInviteDto.token - 초대 토큰
     * 
     * @returns 초대 거절 결과
     * - success: 성공 여부
     * - message: 결과 메시지
     * 
     * 에러 처리:
     * - 초대를 찾을 수 없는 경우
     * - 초대가 만료된 경우
     * - 이미 처리된 초대인 경우
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
     * 
     * 신규 회원이 회원가입을 완료한 후 협업자로 등록하는 기능입니다.
     * 
     * 워크플로우:
     * 1. 초대 정보 조회 (수락된 상태인지 확인)
     * 2. 사용자 정보 조회
     * 3. 이미 협업자인지 확인
     * 4. 협업자 등록
     * 5. 개인 세션 생성 (Session 엔티티 구현 후 활성화)
     * 
     * @param token - 초대 토큰
     * @param userId - 회원가입 완료된 사용자 ID
     * 
     * @returns 협업자 등록 결과
     * - success: 성공 여부
     * - message: 결과 메시지
     * - track_id: 트랙 ID
     * 
     * 에러 처리:
     * - 초대를 찾을 수 없는 경우
     * - 수락되지 않은 초대인 경우
     * - 사용자를 찾을 수 없는 경우
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
     * 
     * 초대 배치의 모든 초대가 처리되었는지 확인하고,
     * 완료된 경우 배치 상태를 'completed'로 업데이트합니다.
     * 
     * @param batchId - 배치 ID
     * @param manager - 트랜잭션 매니저
     * 
     * 로직:
     * 1. 해당 배치의 pending 상태 초대 개수 확인
     * 2. pending 초대가 0개인 경우 배치 상태를 'completed'로 변경
     * 
     * 사용 시점:
     * - 초대 수락 시
     * - 초대 거절 시
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
