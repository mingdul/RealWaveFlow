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
      // 입력 데이터 검증
      if (!inviteData.trackName || !inviteData.inviterName || !inviteData.inviteToken) {
        const error = 'Missing required invite data fields';
        this.logger.error(`${error}: trackName=${inviteData.trackName}, inviterName=${inviteData.inviterName}, token=${inviteData.inviteToken}`);
        return { success: false, error };
      }

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
        trackName: inviteData.trackName,
        inviterName: inviteData.inviterName,
        inviteUrl,
        expiresAtFormatted
      });

      this.logger.log(`Attempting to send email to ${to} with Resend API (track: "${inviteData.trackName}", inviter: "${inviteData.inviterName}")`);

      // Resend API를 통한 이메일 발송
      // 주의: Resend API는 초당 2개 요청 제한이 있으므로 다중 이메일 발송 시 직렬 처리 필요
      const result = await this.resend.emails.send({
        from: 'WaveFlow <onboarding@waveflow.pro>',
        to: [to],
        subject: `🎵 ${inviteData.inviterName}님이 "${inviteData.trackName}" 트랙에 초대했습니다`,
        html: emailHtml,
      });

      this.logger.debug(`Resend API response for ${to}:`, JSON.stringify(result, null, 2));

      // Resend API 응답에서 에러 확인
      if (result.error) {
        this.logger.error(`Resend API error for ${to}:`, result.error);
        return {
          success: false,
          error: result.error.message || 'Unknown Resend error'
        };
      }

      this.logger.log(`✅ Invite email sent successfully to ${to}. Message ID: ${result.data?.id}`);
      
      return {
        success: true,
        messageId: result.data?.id
      };

    } catch (error) {
      this.logger.error(`❌ Failed to send invite email to ${to}:`, error);
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
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
          }
          
          body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
              min-height: 100vh;
          }
          
          .email-wrapper {
              max-width: 680px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
          }
          
          .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 40px 60px;
              text-align: center;
              position: relative;
              overflow: hidden;
          }
          
          .header::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="25" cy="25" r="1.5" fill="rgba(255,255,255,0.08)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.06)"/><circle cx="20" cy="80" r="1.2" fill="rgba(255,255,255,0.05)"/><circle cx="90" cy="30" r="0.8" fill="rgba(255,255,255,0.04)"/></svg>');
              animation: float 20s linear infinite;
              opacity: 0.3;
          }
          
          @keyframes float {
              0% { transform: translate(0, 0) rotate(0deg); }
              100% { transform: translate(-50px, -50px) rotate(360deg); }
          }
          
          .logo {
              position: relative;
              z-index: 2;
              font-size: 42px;
              font-weight: 700;
              color: #ffffff;
              margin-bottom: 20px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
          }
          
          .logo::before {
              content: '🎵';
              font-size: 48px;
              animation: pulse 2s ease-in-out infinite;
          }
          
          @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
          }
          
          .header-title {
              position: relative;
              z-index: 2;
              font-size: 32px;
              font-weight: 600;
              color: #ffffff;
              margin-bottom: 12px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .header-subtitle {
              position: relative;
              z-index: 2;
              font-size: 18px;
              color: rgba(255, 255, 255, 0.9);
              font-weight: 400;
          }
          
          .content {
              padding: 50px 40px 40px;
              background: #ffffff;
          }
          
          .greeting {
              font-size: 18px;
              color: #2d3748;
              margin-bottom: 30px;
              font-weight: 500;
          }
          
          .track-showcase {
              background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
              border: 2px solid #e2e8f0;
              border-radius: 20px;
              padding: 32px;
              margin: 32px 0;
              text-align: center;
              position: relative;
              overflow: hidden;
          }
          
          .track-showcase::before {
              content: '';
              position: absolute;
              top: -2px;
              left: -2px;
              right: -2px;
              bottom: -2px;
              background: linear-gradient(135deg, #667eea, #764ba2, #667eea);
              border-radius: 22px;
              z-index: -1;
              animation: shimmer 3s ease-in-out infinite;
          }
          
          @keyframes shimmer {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
          }
          
          .track-icon {
              font-size: 64px;
              margin-bottom: 16px;
              display: block;
              animation: bounce 2s ease-in-out infinite;
          }
          
          @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
          }
          
          .track-name {
              font-size: 28px;
              font-weight: 700;
              color: #1a202c;
              margin-bottom: 12px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
          }
          
          .inviter-info {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              font-size: 16px;
              color: #4a5568;
              margin-bottom: 20px;
          }
          
          .inviter-name {
              font-weight: 600;
              color: #667eea;
          }
          
          .collaboration-features {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 16px;
              margin: 24px 0;
              padding: 24px;
              background: rgba(102, 126, 234, 0.05);
              border-radius: 16px;
              border: 1px solid rgba(102, 126, 234, 0.1);
          }
          
          .feature-item {
              text-align: center;
              padding: 16px;
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.8);
              transition: all 0.3s ease;
          }
          
          .feature-item:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          }
          
          .feature-icon {
              font-size: 32px;
              margin-bottom: 8px;
              display: block;
          }
          
          .feature-text {
              font-size: 14px;
              color: #4a5568;
              font-weight: 500;
          }
          
          .cta-container {
              text-align: center;
              margin: 40px 0;
          }
          
          .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 20px 48px;
              border-radius: 16px;
              font-weight: 700;
              font-size: 18px;
              text-align: center;
              transition: all 0.3s ease;
              box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
              position: relative;
              overflow: hidden;
          }
          
          .cta-button::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
              transition: left 0.5s ease;
          }
          
          .cta-button:hover::before {
              left: 100%;
          }
          
          .cta-button:hover {
              transform: translateY(-3px);
              box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
          }
          
          .expire-warning {
              background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
              border: 1px solid #fc8181;
              border-radius: 12px;
              padding: 20px;
              margin: 32px 0;
              text-align: center;
              position: relative;
          }
          
          .expire-warning::before {
              content: '⏰';
              font-size: 24px;
              position: absolute;
              left: 20px;
              top: 50%;
              transform: translateY(-50%);
          }
          
          .expire-text {
              font-size: 16px;
              color: #c53030;
              font-weight: 600;
              margin-left: 40px;
          }
          
          .expire-time {
              font-size: 18px;
              font-weight: 700;
              color: #9b2c2c;
              margin-top: 4px;
          }
          
          .link-fallback {
              background: #f7fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin: 20px 0;
              font-family: 'Monaco', 'Consolas', monospace;
              font-size: 14px;
              color: #4a5568;
              word-break: break-all;
              text-align: left;
          }
          
          .footer {
              background: #f8f9fa;
              padding: 40px;
              text-align: center;
              border-top: 1px solid #e9ecef;
          }
          
          .footer-content {
              max-width: 500px;
              margin: 0 auto;
          }
          
          .footer-title {
              font-size: 18px;
              font-weight: 600;
              color: #495057;
              margin-bottom: 16px;
          }
          
          .footer-text {
              font-size: 14px;
              color: #6c757d;
              line-height: 1.6;
              margin-bottom: 8px;
          }
          
          .social-links {
              margin-top: 24px;
              display: flex;
              justify-content: center;
              gap: 16px;
          }
          
          .social-link {
              display: inline-block;
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 50%;
              color: white;
              text-decoration: none;
              font-size: 18px;
              line-height: 40px;
              transition: all 0.3s ease;
          }
          
          .social-link:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }
          
          @media (max-width: 600px) {
              .email-wrapper {
                  margin: 10px;
                  border-radius: 16px;
              }
              
              .header, .content, .footer {
                  padding: 30px 20px;
              }
              
              .logo {
                  font-size: 36px;
              }
              
              .header-title {
                  font-size: 24px;
              }
              
              .track-name {
                  font-size: 22px;
              }
              
              .collaboration-features {
                  grid-template-columns: 1fr;
              }
              
              .cta-button {
                  padding: 18px 36px;
                  font-size: 16px;
              }
          }
      </style>
  </head>
  <body>
      <div class="email-wrapper">
          <div class="header">
              <div class="logo">
              <img src="https://waveflow.pro/backend-assets/waveflow_logo_resized.png" alt="WaveFlow Logo" style="height: 40px; margin-right: 10px;">
              WaveFlow
          </div>
              <h1 class="header-title">음악 협업 초대</h1>
              <p class="header-subtitle">창의적인 음악 여행에 함께하세요</p>
          </div>
          
          <div class="content">
              <p class="greeting">안녕하세요! 🎶</p>
              
              <p style="font-size: 16px; color: #4a5568; margin-bottom: 24px;">
                  <strong style="color: #667eea;">${data.inviterName}</strong>님이 특별한 음악 협업 프로젝트에 초대했습니다.
              </p>
              
              <div class="track-showcase">
                  <span class="track-icon">🎼</span>
                  <div class="track-name">${data.trackName}</div>
                  <div class="inviter-info">
                      <span>👤</span>
                      <span>초대자: <span class="inviter-name">${data.inviterName}</span></span>
                  </div>
              </div>
              
              <div class="collaboration-features">
                  <div class="feature-item">
                      <span class="feature-icon">🎹</span>
                      <div class="feature-text">실시간 협업</div>
                  </div>
          
                  <div class="feature-item">
                      <span class="feature-icon">🎸</span>
                      <div class="feature-text">스템 업로드</div>
                  </div>
                  <div class="feature-item">
                      <span class="feature-icon">🎵</span>
                      <div class="feature-text">음악 파일 버전 관리</div>
                  </div>
              </div>
              
              <p style="font-size: 16px; color: #4a5568; text-align: center; margin: 32px 0;">
                  함께 음악을 만들어보세요! 아래 버튼을 클릭하여 협업을 시작하세요.
              </p>
              
              <div class="cta-container">
                  <a href="${data.inviteUrl}" class="cta-button">
                      🎵 초대 수락하고 협업 시작하기
                  </a>
              </div>
              
              <div class="expire-warning">
                  <div class="expire-text">초대 만료 시간</div>
                  <div class="expire-time">${data.expiresAtFormatted}</div>
                  <div style="font-size: 14px; color: #c53030; margin-top: 8px;">
                      이 초대는 24시간 후 자동으로 만료됩니다.
                  </div>
              </div>
              
              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                  <p style="font-size: 14px; color: #6b7280; margin-bottom: 12px;">
                      버튼이 작동하지 않는다면 아래 링크를 복사하여 브라우저에 붙여넣으세요:
                  </p>
                  <div class="link-fallback">
                      ${data.inviteUrl}
                  </div>
              </div>
          </div>
          
          <div class="footer">
              <div class="footer-content">
                  <h3 class="footer-title">🎵 WaveFlow</h3>
                  <p class="footer-text">
                      음악가들을 위한 최고의 협업 플랫폼
                  </p>
                  <p class="footer-text">
                      이 이메일은 WaveFlow에서 발송되었습니다. 초대를 원하지 않으시면 이 이메일을 무시하셔도 됩니다.
                  </p>
                  
                  <div class="social-links">
                      <a href="#" class="social-link">🎵</a>
                      <a href="#" class="social-link">🎤</a>
                      <a href="#" class="social-link">🎸</a>
                  </div>
              </div>
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
        from: 'WaveFlow <noreply@waveflow.pro>',
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
