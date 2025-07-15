import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * 이메일 서비스
 * 
 * WaveFlow 플랫폼의 이메일 발송을 담당하는 서비스
 * Resend API를 사용하여 초대 이메일, 알림 이메일 등을 발송
 * 
 * 주요 기능:
 * - 초대 이메일 발송 (트랙 협업 초대)
 * - 이메일 템플릿 생성 (HTML 형식)
 * - 이메일 전송 상태 추적 및 에러 처리
 * - 테스트 이메일 발송
 * 
 * 의존성:
 * - Resend API: 실제 이메일 발송 서비스
 * - 환경변수: RESEND_API_KEY, FRONTEND_URL
 * 
 * 사용 예시:
 * - 트랙 소유자가 협업자에게 초대 이메일 발송
 * - 시스템 알림 이메일 발송
 * - 이메일 서비스 상태 확인
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  /**
   * EmailService 생성자
   * 
   * Resend API 클라이언트를 초기화하고 환경 설정을 확인
   * RESEND_API_KEY가 없으면 이메일 발송 기능이 비활성화됨
   */
  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not found. Email sending will be disabled.');
      return;
    }
    
    this.resend = new Resend(apiKey);
    this.logger.log('Resend email service initialized');
  }

  /**
   * 초대 이메일 전송
   * 
   * 트랙 협업 초대를 위한 이메일을 발송합니다.
   * 
   * 워크플로우:
   * 1. 초대 데이터 검증
   * 2. 초대 URL 생성 (프론트엔드 URL + 토큰)
   * 3. 만료 시간 포맷팅 (한국 시간대)
   * 4. HTML 이메일 템플릿 생성
   * 5. Resend API를 통한 이메일 발송
   * 6. 발송 결과 로깅 및 반환
   * 
   * @param to - 수신자 이메일 주소
   * @param inviteData - 초대 관련 데이터
   * @param inviteData.trackName - 초대 대상 트랙 이름
   * @param inviteData.inviterName - 초대자 이름
   * @param inviteData.inviteToken - 고유한 초대 토큰
   * @param inviteData.expiresAt - 초대 만료 시간
   * 
   * @returns 발송 결과 객체
   * - success: 발송 성공 여부
   * - messageId: Resend에서 제공하는 메시지 ID (성공 시)
   * - error: 에러 메시지 (실패 시)
   * 
   * 에러 처리:
   * - Resend API 키가 없는 경우
   * - 네트워크 오류
   * - Resend API 응답 오류
   * - 이메일 형식 오류
   */
  async sendInviteEmail(
    to: string,
    inviteData: {
      trackName: string;
      inviterName: string;
      inviteToken: string;
      expiresAt: Date;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Resend 클라이언트가 초기화되지 않은 경우 처리
    if (!this.resend) {
      this.logger.warn('Resend not initialized. Skipping email send.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      // 초대 URL 생성 (프론트엔드의 초대 수락 페이지로 연결)
      const inviteUrl = `${process.env.FRONTEND_URL}/invite/${inviteData.inviteToken}`;
      
      // 만료 시간을 한국 시간대로 포맷팅
      const expiresAtFormatted = inviteData.expiresAt.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Seoul'
      });

      // HTML 이메일 템플릿 생성
      const emailHtml = this.generateInviteEmailTemplate({
        ...inviteData,
        inviteUrl,
        expiresAtFormatted
      });

      this.logger.log(`Attempting to send email to ${to} with Resend API`);

      // Resend API를 통한 이메일 발송
      const result = await this.resend.emails.send({
        from: 'WaveFlow <onboarding@resend.dev>',
        to: [to],
        subject: `🎵 ${inviteData.inviterName}님이 "${inviteData.trackName}" 트랙에 초대했습니다`,
        html: emailHtml,
      });

      this.logger.log(`Resend API response:`, JSON.stringify(result, null, 2));

      // Resend API 응답에서 에러 확인
      if (result.error) {
        this.logger.error(`Resend API error:`, result.error);
        return {
          success: false,
          error: result.error.message || 'Unknown Resend error'
        };
      }

      this.logger.log(`Invite email sent successfully to ${to}. Message ID: ${result.data?.id}`);
      
      return {
        success: true,
        messageId: result.data?.id
      };

    } catch (error) {
      this.logger.error(`Failed to send invite email to ${to}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 초대 이메일 HTML 템플릿 생성
   * 
   * 초대 이메일의 HTML 내용을 생성합니다.
   * 반응형 디자인과 모던한 UI를 적용하여 사용자 경험을 향상시킵니다.
   * 
   * 템플릿 특징:
   * - 반응형 디자인 (모바일/데스크톱 호환)
   * - WaveFlow 브랜딩 적용
   * - 명확한 CTA 버튼
   * - 만료 시간 안내
   * - 폴백 링크 제공 (버튼이 작동하지 않을 경우)
   * 
   * @param data - 템플릿에 삽입할 데이터
   * @param data.trackName - 트랙 이름
   * @param data.inviterName - 초대자 이름
   * @param data.inviteUrl - 초대 수락 URL
   * @param data.expiresAtFormatted - 포맷된 만료 시간
   * 
   * @returns HTML 문자열
   */
  private generateInviteEmailTemplate(data: {
    trackName: string;
    inviterName: string;
    inviteUrl: string;
    expiresAtFormatted: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WaveFlow 트랙 초대</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 16px;
        }
        .title {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 12px;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 32px;
        }
        .content {
            margin-bottom: 40px;
        }
        .track-info {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
        }
        .track-name {
            font-size: 20px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 8px;
        }
        .inviter-name {
            color: #6366f1;
            font-size: 16px;
            font-weight: 600;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            text-decoration: none;
            padding: 18px 36px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 18px;
            text-align: center;
            margin: 24px 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .expire-info {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
            color: #92400e;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .link-fallback {
            word-break: break-all;
            background: #f3f4f6;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">WaveFlow</div>
            <h1 class="title">트랙 협업 초대</h1>
        </div>
        
        <div class="content">
            <p>안녕하세요!</p>
            <p><strong>${data.inviterName}</strong>님이 음악 협업 프로젝트에 초대했습니다.</p>
            
            <div class="track-info">
                <div class="track-name">🎼 ${data.trackName}</div>
                <div class="inviter-name">초대자: ${data.inviterName}</div>
            </div>
            
            <p>아래 버튼을 클릭하여 초대를 수락하고 협업을 시작하세요!</p>
            
            <div style="text-align: center;">
                <a href="${data.inviteUrl}" class="cta-button">
                    초대 수락하기
                </a>
            </div>
            
            <div class="expire-info">
                ⏰ <strong>만료 시간:</strong> ${data.expiresAtFormatted}<br>
                이 초대 링크는 24시간 후 자동으로 만료됩니다.
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
                버튼이 작동하지 않는다면 아래 링크를 복사하여 브라우저에 붙여넣으세요:
            </p>
            <div class="link-fallback">
                ${data.inviteUrl}
            </div>
        </div>
        
        <div class="footer">
            <p>이 이메일은 WaveFlow 음악 협업 플랫폼에서 발송되었습니다.</p>
            <p>초대를 원하지 않으시면 이 이메일을 무시하셔도 됩니다.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * 이메일 전송 테스트
   * 
   * 이메일 서비스가 정상적으로 작동하는지 확인하기 위한 테스트 이메일을 발송합니다.
   * 개발 및 디버깅 목적으로 사용됩니다.
   * 
   * @param to - 테스트 이메일을 받을 주소
   * 
   * @returns 테스트 결과 객체
   * - success: 발송 성공 여부
   * - messageId: 메시지 ID (성공 시)
   * - error: 에러 메시지 (실패 시)
   * 
   * 사용 예시:
   * - 개발 환경에서 이메일 서비스 설정 확인
   * - Resend API 연결 상태 확인
   * - 이메일 템플릿 테스트
   */
  async testEmail(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.resend) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const result = await this.resend.emails.send({
        from: 'WaveFlow <noreply@waveflow.com>',
        to: [to],
        subject: 'WaveFlow 이메일 테스트',
        html: `
          <h1>🎵 WaveFlow 이메일 테스트</h1>
          <p>이메일 서비스가 정상적으로 작동합니다!</p>
          <p>전송 시간: ${new Date().toLocaleString('ko-KR')}</p>
        `,
      });

      return {
        success: true,
        messageId: result.data?.id
      };
    } catch (error) {
      this.logger.error(`Test email failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
