import { Controller, Get, Param, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { InviteService } from './invite.service';
import { AuthGuard } from '@nestjs/passport';
import { SendInviteDto } from './dto/send-invite.dto';
import { CheckEmailDto } from './dto/check-email.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { DeclineInviteDto } from './dto/decline-invite.dto';

@Controller('invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  // 새로운 이메일 기반 초대 API들 (더 구체적인 라우트를 먼저 정의)

  /**
   * 실시간 이메일 중복 체크
   * GET /invite/check-email/:trackId?email=test@example.com
   */
  @Get('check-email/:trackId')
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
   * POST /invite/send
   */
  @Post('send')
  @UseGuards(AuthGuard('jwt'))
  async sendInvites(
    @Body() sendInviteDto: SendInviteDto,
    @Req() req: any
  ) {
    const inviterId = req.user.id;
    return this.inviteService.sendInvites(sendInviteDto, inviterId);
  }

  /**
   * 초대 수락 페이지 데이터 조회
   * GET /invite/accept-page/:token
   */
  @Get('accept-page/:token')
  async getInviteAcceptPage(@Param('token') token: string) {
    const inviteTarget = await this.inviteService.getInviteByTargetToken(token);
    
    return {
      success: true,
      data: {
        track_name: inviteTarget.invite_batch.track.name,
        inviter_name: inviteTarget.invite_batch.inviter.username,
        email: inviteTarget.email,
        expires_at: inviteTarget.invite_batch.expires_at,
        status: inviteTarget.status
      }
    };
  }

  /**
   * 초대 수락 처리
   * POST /invite/accept
   */
  @Post('accept')
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
   * POST /invite/decline
   */
  @Post('decline')
  async declineInvite(@Body() declineInviteDto: DeclineInviteDto) {
    return this.inviteService.declineInvite(declineInviteDto);
  }

  /**
   * 회원가입 완료 후 협업자 등록
   * POST /invite/complete-signup
   */
  @Post('complete-signup')
  @UseGuards(AuthGuard('jwt'))
  async completeInviteAfterSignup(
    @Body('token') token: string,
    @Req() req: any
  ) {
    const userId = req.user.id;
    return this.inviteService.completeInviteAfterSignup(token, userId);
  }

  /**
   * 이메일 전송 테스트
   * POST /invite/test-email
   */
  @Post('test-email')
  async testEmail(@Body('email') email: string) {
    const emailService = new (await import('../email/email.service')).EmailService();
    return emailService.testEmail(email);
  }

  // 기존 API들 (파라미터 라우트는 나중에 정의)
  
  // 1. 초대 링크 생성 (owner만 가능)
  @Post(':trackId')
  @UseGuards(AuthGuard('jwt'))
  async createInvite(@Param('trackId') trackId: string) {
    return this.inviteService.createInviteLink(trackId);
  }
}
