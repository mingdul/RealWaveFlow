import { Controller, Get, Param, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InviteService } from './invite.service';
import { AuthGuard } from '@nestjs/passport';
import { SendInviteDto } from './dto/send-invite.dto';
import { CheckEmailDto } from './dto/check-email.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { DeclineInviteDto } from './dto/decline-invite.dto';

/**
 * 초대 컨트롤러
 * 
 * WaveFlow 플랫폼의 트랙 협업 초대 관련 API 엔드포인트를 제공합니다.
 * 이메일 기반 초대 시스템과 링크 기반 초대 시스템을 모두 지원합니다.
 * 
 * 주요 기능:
 * - 실시간 이메일 중복 체크
 * - 다중 이메일 초대 발송
 * - 초대 수락/거절 처리
 * - 초대 페이지 데이터 조회
 * - 회원가입 완료 후 협업자 등록
 * - 이메일 서비스 테스트
 * 
 * 인증 요구사항:
 * - 초대 발송: JWT 인증 필요 (트랙 소유자만)
 * - 초대 수락/거절: 인증 불필요 (토큰 기반)
 * - 회원가입 완료 처리: JWT 인증 필요
 * 
 * API 구조:
 * - GET /invite/check-email/:trackId - 이메일 중복 체크
 * - POST /invite/send - 다중 이메일 초대 발송
 * - GET /invite/accept-page/:token - 초대 수락 페이지 데이터
 * - POST /invite/accept - 초대 수락 처리
 * - POST /invite/decline - 초대 거절 처리
 * - POST /invite/complete-signup - 회원가입 완료 후 협업자 등록
 * - POST /invite/test-email - 이메일 서비스 테스트
 * - POST /invite/:trackId - 공개 초대 링크 생성 (기존 시스템)
 */
@ApiTags('invite')
@Controller('invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  // 새로운 이메일 기반 초대 API들 (더 구체적인 라우트를 먼저 정의)

  /**
   * 실시간 이메일 중복 체크
   * 
   * 프론트엔드에서 실시간으로 이메일 중복 여부를 확인할 수 있는 API입니다.
   * 사용자가 이메일을 입력할 때마다 호출하여 즉시 피드백을 제공합니다.
   * 
   * 검증 항목:
   * - 트랙 소유자 이메일인지 확인
   * - 이미 협업자인지 확인
   * - 이미 초대된 이메일인지 확인 (pending 상태)
   * 
   * @param trackId - 초대 대상 트랙 ID (URL 파라미터)
   * @param email - 체크할 이메일 주소 (쿼리 파라미터)
   * 
   * @returns 중복 체크 결과
   * - isDuplicate: 중복 여부 (true/false)
   * - message: 중복인 경우 이유 설명
   * 
   * 사용 예시:
   * GET /invite/check-email/123e4567-e89b-12d3-a456-426614174000?email=test@example.com
   * 
   * 응답 예시:
   * { "isDuplicate": false } 또는 { "isDuplicate": true, "message": "이미 초대된 이메일입니다." }
   */
  @Get('check-email/:trackId')
  @ApiOperation({ summary: '이메일 중복 체크', description: '실시간으로 이메일 중복 여부를 확인합니다.' })
  @ApiParam({ name: 'trackId', description: '트랙 ID' })
  @ApiQuery({ name: 'email', description: '체크할 이메일 주소', required: false })
  @ApiResponse({ status: 200, description: '이메일 중복 체크 성공' })
  async checkEmail(
    @Param('trackId') trackId: string,
    @Query('email') email: string
  ) {
    if (!email) {
      return { isDuplicate: false };
    }

    const result = await this.inviteService.checkEmailDuplicate(trackId, email);
    return result;
  }

  /**
   * 다중 이메일 초대 발송
   * 
   * 트랙 소유자가 여러 이메일 주소로 동시에 초대를 발송하는 메인 API입니다.
   * 
   * 워크플로우:
   * 1. JWT 토큰에서 사용자 ID 추출
   * 2. 트랙 소유자 권한 확인
   * 3. 각 이메일에 대한 중복 체크 수행
   * 4. 유효한 이메일에 대해 초대 배치 생성
   * 5. 이메일 서비스를 통한 초대 이메일 발송
   * 6. 발송 결과 집계 및 반환
   * 
   * @param sendInviteDto - 초대 발송 데이터
   * @param sendInviteDto.trackId - 초대 대상 트랙 ID
   * @param sendInviteDto.emails - 초대할 이메일 목록 (최소 1개)
   * @param sendInviteDto.expiresInDays - 만료 기간 (일, 선택적, 1-30일)
   * @param req - HTTP 요청 객체 (JWT 토큰 포함)
   * 
   * @returns 초대 발송 결과
   * - success: 전체 성공 여부
   * - message: 결과 메시지
   * - batch_id: 생성된 배치 ID
   * - sent_count: 성공적으로 발송된 이메일 수
   * - failed_emails: 실패한 이메일 목록
   * 
   * 인증: JWT 토큰 필요 (트랙 소유자만)
   * 
   * 사용 예시:
   * POST /invite/send
   * {
   *   "trackId": "123e4567-e89b-12d3-a456-426614174000",
   *   "emails": ["user1@example.com", "user2@example.com"],
   *   "expiresInDays": 7
   * }
   */
  @Post('send')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '다중 이메일 초대 발송', description: '여러 이메일 주소로 동시에 초대를 발송합니다.' })
  @ApiBody({ type: SendInviteDto })
  @ApiResponse({ status: 200, description: '초대 발송 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async sendInvites(
    @Body() sendInviteDto: SendInviteDto,
    @Req() req: any
  ) {
    const inviterId = req.user.id;
    return this.inviteService.sendInvites(sendInviteDto, inviterId);
  }

  /**
   * 초대 토큰 검증
   * 
   * 초대 토큰의 유효성을 검사하고 초대 정보를 반환합니다.
   * 프론트엔드에서 초대 링크 접속 시 호출하는 API입니다.
   * 
   * @param token - 초대 토큰 (URL 파라미터)
   * 
   * @returns 초대 검증 결과
   * - success: 성공 여부
   * - data: 초대 정보 (성공 시)
   *   - track_name: 트랙 이름
   *   - inviter_name: 초대자 이름
   *   - email: 초대받은 이메일
   *   - expires_at: 만료 시간
   *   - status: 초대 상태
   * 
   * 인증: 불필요 (토큰 기반 접근)
   * 
   * 사용 예시:
   * GET /invite/validate/abc123-def456-ghi789
   * 
   * 응답 예시:
   * {
   *   "success": true,
   *   "data": {
   *     "track_name": "My Awesome Track",
   *     "inviter_name": "John Doe",
   *     "email": "user@example.com",
   *     "expires_at": "2024-01-15T10:00:00Z",
   *     "status": "pending"
   *   }
   * }
   */
  @Get('validate/:token')
  @ApiOperation({ summary: '초대 토큰 검증', description: '초대 토큰의 유효성을 검사합니다.' })
  @ApiParam({ name: 'token', description: '초대 토큰' })
  @ApiResponse({ status: 200, description: '초대 토큰 검증 성공' })
  @ApiResponse({ status: 404, description: '초대를 찾을 수 없음' })
  @ApiResponse({ status: 410, description: '초대가 만료됨' })
  async validateInviteToken(@Param('token') token: string) {
    return await this.inviteService.validateInviteToken(token);
  }

  /**
   * 초대 수락 페이지 데이터 조회
   * 
   * 사용자가 초대 링크를 클릭했을 때 표시할 초대 정보를 조회합니다.
   * 프론트엔드에서 초대 수락 페이지를 렌더링할 때 필요한 데이터를 제공합니다.
   * 
   * @param token - 초대 토큰 (URL 파라미터)
   * 
   * @returns 초대 페이지 데이터
   * - success: 성공 여부
   * - data: 초대 정보
   *   - track_name: 트랙 이름
   *   - inviter_name: 초대자 이름
   *   - email: 초대받은 이메일
   *   - expires_at: 만료 시간
   *   - status: 초대 상태
   * 
   * 인증: 불필요 (토큰 기반 접근)
   * 
   * 사용 예시:
   * GET /invite/accept-page/abc123-def456-ghi789
   * 
   * 응답 예시:
   * {
   *   "success": true,
   *   "data": {
   *     "track_name": "My Awesome Track",
   *     "inviter_name": "John Doe",
   *     "email": "user@example.com",
   *     "expires_at": "2024-01-15T10:00:00Z",
   *     "status": "pending"
   *   }
   * }
   */
  @Get('accept-page/:token')
  @ApiOperation({ summary: '초대 수락 페이지 데이터 조회', description: '초대 토큰으로 초대 정보를 조회합니다.' })
  @ApiParam({ name: 'token', description: '초대 토큰' })
  @ApiResponse({ status: 200, description: '초대 페이지 데이터 조회 성공' })
  @ApiResponse({ status: 404, description: '초대를 찾을 수 없음' })
  async getInviteAcceptPage(@Param('token') token: string) {
    const inviteTarget = await this.inviteService.getInviteByTargetToken(token);
    
    return {
      success: true,
      data: {
        track_name: inviteTarget.invite_batch.track.title,
        inviter_name: inviteTarget.invite_batch.inviter.username,
        email: inviteTarget.email,
        expires_at: inviteTarget.invite_batch.expires_at,
        status: inviteTarget.status
      }
    };
  }

  /**
   * 초대 수락 처리
   * 
   * 사용자가 초대를 수락했을 때의 처리 API입니다.
   * 기존 회원과 신규 회원을 구분하여 처리합니다.
   * 
   * 워크플로우:
   * 1. 초대 토큰으로 초대 정보 조회
   * 2. 초대 유효성 검증 (만료, 상태 등)
   * 3. 사용자 상태 확인 (기존 회원/신규 회원)
   * 4. 기존 회원이고 로그인된 경우 즉시 협업자 등록
   * 5. 초대 상태 업데이트
   * 6. 응답 데이터 생성
   * 
   * @param acceptInviteDto - 초대 수락 데이터
   * @param acceptInviteDto.token - 초대 토큰
   * @param acceptInviteDto.user_id - 로그인된 사용자 ID (선택적)
   * @param req - HTTP 요청 객체 (JWT 토큰 포함, 선택적)
   * 
   * @returns 초대 수락 결과
   * - success: 성공 여부
   * - message: 결과 메시지
   * - user_status: 사용자 상태 ('existing' | 'new')
   * - track_id: 트랙 ID
   * - redirect_url: 리다이렉트 URL (기존 회원인 경우)
   * 
   * 인증: 선택적 (JWT 토큰이 있으면 사용자 ID 추출)
   * 
   * 사용자 상태별 처리:
   * - existing: 기존 회원, 즉시 협업자 등록
   * - new: 신규 회원, 회원가입 완료 후 협업자 등록 필요
   * 
   * 사용 예시:
   * POST /invite/accept
   * {
   *   "token": "abc123-def456-ghi789",
   *   "user_id": "user123" // 선택적
   * }
   */
  @Post('accept')
  @ApiOperation({ summary: '초대 수락 처리', description: '초대를 수락하고 협업자로 등록합니다.' })
  @ApiBody({ type: AcceptInviteDto })
  @ApiResponse({ status: 200, description: '초대 수락 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  @ApiResponse({ status: 404, description: '초대를 찾을 수 없음' })
  async acceptInvite(@Body() acceptInviteDto: AcceptInviteDto, @Req() req: any) {
    // JWT 토큰이 있으면 사용자 ID 추출
    let userId = null;
    if (req.headers.authorization) {
      try {
        // JWT 토큰 검증은 선택적으로 처리
        // 로그인된 사용자의 경우에만 user_id 설정
        userId = req.user?.id;
      } catch (error) {
        // 토큰이 없거나 유효하지 않은 경우 무시
      }
    }

    const dto = { ...acceptInviteDto, user_id: userId };
    return this.inviteService.acceptInvite(dto);
  }

  /**
   * 초대 거절 처리
   * 
   * 사용자가 초대를 거절했을 때의 처리 API입니다.
   * 
   * @param declineInviteDto - 초대 거절 데이터
   * @param declineInviteDto.token - 초대 토큰
   * 
   * @returns 초대 거절 결과
   * - success: 성공 여부
   * - message: 결과 메시지
   * 
   * 인증: 불필요 (토큰 기반 접근)
   * 
   * 사용 예시:
   * POST /invite/decline
   * {
   *   "token": "abc123-def456-ghi789"
   * }
   */
  @Post('decline')
  @ApiOperation({ summary: '초대 거절 처리', description: '초대를 거절합니다.' })
  @ApiBody({ type: DeclineInviteDto })
  @ApiResponse({ status: 200, description: '초대 거절 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  @ApiResponse({ status: 404, description: '초대를 찾을 수 없음' })
  async declineInvite(@Body() declineInviteDto: DeclineInviteDto) {
    return this.inviteService.declineInvite(declineInviteDto);
  }

  /**
   * 회원가입 완료 후 협업자 등록
   * 
   * 신규 회원이 회원가입을 완료한 후 초대를 수락하여 협업자로 등록하는 API입니다.
   * 
   * @param token - 초대 토큰
   * @param req - HTTP 요청 객체 (JWT 토큰 포함)
   * 
   * @returns 협업자 등록 결과
   * - success: 성공 여부
   * - message: 결과 메시지
   * 
   * 인증: JWT 토큰 필요
   * 
   * 사용 예시:
   * POST /invite/complete-signup
   * {
   *   "token": "abc123-def456-ghi789"
   * }
   */
  @Post('complete-signup')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '회원가입 완료 후 협업자 등록', description: '신규 회원이 회원가입 완료 후 협업자로 등록합니다.' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: '협업자 등록 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '초대를 찾을 수 없음' })
  async completeInviteAfterSignup(
    @Body('token') token: string,
    @Req() req: any
  ) {
    return this.inviteService.completeInviteAfterSignup(token, req.user.id);
  }

  /**
   * 이메일 서비스 테스트
   * 
   * 이메일 서비스가 정상적으로 작동하는지 테스트하는 API입니다.
   * 개발 및 디버깅 목적으로 사용됩니다.
   * 
   * @param email - 테스트 이메일 주소
   * 
   * @returns 이메일 테스트 결과
   * - success: 성공 여부
   * - message: 결과 메시지
   * 
   * 인증: 불필요
   * 
   * 사용 예시:
   * POST /invite/test-email
   * {
   *   "email": "test@example.com"
   * }
   */
  @Post('test-email')
  @ApiOperation({ summary: '이메일 서비스 테스트', description: '이메일 서비스가 정상적으로 작동하는지 테스트합니다.' })
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: '이메일 테스트 성공' })
  @ApiResponse({ status: 400, description: '이메일 형식 오류' })
  async testEmail(@Body('email') email: string) {
    const emailService = new (await import('../email/email.service')).EmailService();
    return emailService.testEmail(email);
  }

  /**
   * 트랙별 초대 발송
   * 
   * 특정 트랙에 대한 협업자 초대를 발송하는 API입니다.
   * 프론트엔드에서 트랙 페이지에서 직접 호출하는 용도입니다.
   * 
   * @param trackId - 트랙 ID (URL 파라미터)
   * @param body - 초대 데이터
   * @param body.emails - 초대할 이메일 목록
   * @param req - HTTP 요청 객체 (JWT 토큰 포함)
   * 
   * @returns 초대 발송 결과
   * - success: 성공 여부
   * - sent_count: 성공적으로 발송된 이메일 수
   * - failed_emails: 실패한 이메일 목록
   * 
   * 인증: JWT 토큰 필요 (트랙 소유자만)
   * 
   * 사용 예시:
   * POST /invite/track/123e4567-e89b-12d3-a456-426614174000
   * {
   *   "emails": ["user1@example.com", "user2@example.com"]
   * }
   */
  @Post('track/:trackId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '트랙별 초대 발송', description: '특정 트랙에 대한 협업자 초대를 발송합니다.' })
  @ApiParam({ name: 'trackId', description: '트랙 ID' })
  @ApiBody({ schema: { type: 'object', properties: { emails: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 200, description: '초대 발송 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
  async sendTrackInvites(
    @Param('trackId') trackId: string,
    @Body() body: { emails: string[] },
    @Req() req: any
  ) {
    const inviterId = req.user.id;
    const sendInviteDto = {
      trackId,
      emails: body.emails,
      expiresInDays: 7
    };
    
    return this.inviteService.sendInvites(sendInviteDto, inviterId);
  }

  /**
   * 공개 초대 링크 생성 (기존 시스템)
   * 
   * 기존 시스템과의 호환성을 위해 유지되는 API입니다.
   * 새로운 이메일 기반 초대 시스템과 병행하여 사용됩니다.
   * 
   * @param trackId - 트랙 ID (URL 파라미터)
   * 
   * @returns 공개 초대 링크 생성 결과
   * - success: 성공 여부
   * - data: 초대 정보
   *   - invite_url: 공개 초대 링크
   *   - track_id: 트랙 ID
   * 
   * 인증: JWT 토큰 필요 (트랙 소유자만)
   * 
   * 사용 예시:
   * POST /invite/123e4567-e89b-12d3-a456-426614174000
   * 
   * 응답 예시:
   * {
   *   "success": true,
   *   "data": {
   *     "invite_url": "https://waveflow.com/invite/abc123-def456-ghi789",
   *     "track_id": "123e4567-e89b-12d3-a456-426614174000"
   *   }
   * }
   */
  @Post(':trackId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '공개 초대 링크 생성', description: '기존 시스템과의 호환성을 위한 공개 초대 링크를 생성합니다.' })
  @ApiParam({ name: 'trackId', description: '트랙 ID' })
  @ApiResponse({ status: 200, description: '공개 초대 링크 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
  async createInvite(@Param('trackId') trackId: string) {
    return this.inviteService.createInviteLink(trackId);
  }
}
