# 🎵 WaveFlow

음악 협업 플랫폼 - 실시간 음악 제작 및 협업 도구

## 🚀 환경 설정

### 로컬 개발 환경

1. **환경 변수 설정**
   ```bash
   cp .env.example .env
   # .env 파일을 열어서 실제 값들로 수정
   ```

2. **필수 환경 변수**
   - `RESEND_API_KEY`: 이메일 전송을 위한 Resend API 키
   - `JWT_SECRET`: JWT 토큰 암호화 키
   - `DB_PASSWORD`: 데이터베이스 비밀번호
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS S3 설정

3. **Docker로 실행**
   ```bash
   docker-compose -f docker-compose.local.yml up -d
   ```

## 🔐 GitHub Actions Secrets 설정

CI/CD 배포를 위해 다음 Secrets를 GitHub 저장소에 설정해야 합니다.

### Development 환경
- `RESEND_API_KEY`: Resend 이메일 API 키
- `FRONTEND_URL`: 프론트엔드 URL (예: http://localhost:3000)
- `JWT_SECRET`: JWT 암호화 키
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`: 데이터베이스 설정
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS 설정

### Staging 환경
- `STAGING_RESEND_API_KEY`
- `STAGING_FRONTEND_URL`
- `STAGING_JWT_SECRET`
- 기타 STAGING_ 접두사가 붙은 환경 변수들

### Production 환경
- `PROD_RESEND_API_KEY`
- `PROD_FRONTEND_URL`
- `PROD_JWT_SECRET`
- 기타 PROD_ 접두사가 붙은 환경 변수들

## 📧 이메일 시스템

WaveFlow는 [Resend](https://resend.com)를 사용하여 초대 이메일을 전송합니다.

### 설정 방법
1. Resend 계정 생성
2. API 키 발급
3. 환경 변수에 `RESEND_API_KEY` 설정

### 기능
- 🎵 아름다운 HTML 이메일 템플릿
- 📨 트랙 협업 초대 이메일 자동 발송
- ⏰ 24시간 만료 링크
- 🔒 보안 토큰 기반 초대 시스템

## 🏗️ 아키텍처

- **Backend**: NestJS + TypeORM + PostgreSQL
- **Frontend**: React + Vite
- **Email**: Resend API
- **Storage**: AWS S3
- **Deployment**: Docker + GitHub Actions

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 라이센스

This project is licensed under the MIT License.
