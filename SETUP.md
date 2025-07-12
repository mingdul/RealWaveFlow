# 🛠️ WaveFlow 개발 환경 설정 가이드

## 📋 사전 준비사항

- Docker & Docker Compose
- Node.js 18+
- Git

## 🚀 로컬 개발 환경 설정

### 1. 저장소 클론
```bash
git clone https://github.com/Team-Honey-Badgers/WaveFlow.git
cd WaveFlow
```

### 2. 환경 변수 설정
```bash
# 환경 변수 템플릿 복사
cp .env.example .env

# .env 파일 편집 (실제 값으로 변경)
nano .env
```

### 3. 필수 환경 변수

#### 데이터베이스
```env
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=waveflow_user
DB_PASSWORD=your-secure-password
DB_NAME=waveflow_local
```

#### JWT 인증
```env
JWT_SECRET=your-super-secret-jwt-key-here
```

#### 이메일 서비스 (Resend)
```env
RESEND_API_KEY=re_your_resend_api_key_here
FRONTEND_URL=http://localhost:3000
```

#### Google OAuth (선택사항)
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

#### AWS S3 (선택사항)
```env
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID_FOR_GITACTIONS=your-aws-access-key
AWS_SECRET_ACCESS_KEY_FOR_GITACTIONS=your-aws-secret-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name
```

### 4. Docker 컨테이너 실행
```bash
# 로컬 개발 환경 실행
docker-compose -f docker-compose.local.yml up -d

# 로그 확인
docker-compose -f docker-compose.local.yml logs -f
```

### 5. 서비스 확인
- **Backend API**: http://localhost:8080
- **Frontend**: http://localhost:3000
- **Health Check**: http://localhost:8080/health

## 🔑 API 키 발급 방법

### Resend API 키 (이메일 전송)
1. https://resend.com 방문
2. 무료 계정 생성
3. Dashboard → API Keys → Create API Key
4. 발급받은 키를 `.env` 파일의 `RESEND_API_KEY`에 설정

### Google OAuth (선택사항)
1. Google Cloud Console 방문
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. APIs & Services → Credentials
4. OAuth 2.0 Client ID 생성
5. 승인된 리디렉션 URI에 `http://localhost:3000/auth/google/callback` 추가

### AWS S3 (선택사항)
1. AWS Console → IAM
2. 새 사용자 생성
3. S3 권한 부여
4. Access Key 생성

## 🐛 문제 해결

### 컨테이너가 시작되지 않는 경우
```bash
# 컨테이너 정리
docker-compose -f docker-compose.local.yml down --volumes
docker system prune -f

# 다시 빌드
docker-compose -f docker-compose.local.yml up --build -d
```

### 데이터베이스 연결 오류
```bash
# PostgreSQL 컨테이너 상태 확인
docker-compose -f docker-compose.local.yml ps postgres

# 데이터베이스 로그 확인
docker-compose -f docker-compose.local.yml logs postgres
```

### 이메일 전송 실패
1. `RESEND_API_KEY`가 올바른지 확인
2. Resend 계정의 월간 한도 확인
3. 백엔드 로그에서 상세 오류 확인:
   ```bash
   docker-compose -f docker-compose.local.yml logs backend | grep -i email
   ```

## 📞 도움이 필요한 경우

- GitHub Issues에 문제 등록
- 팀 Slack 채널에서 질문
- 이 문서 업데이트 제안 환영!

## 🔄 업데이트

새로운 변경사항을 받으려면:
```bash
git pull origin main
docker-compose -f docker-compose.local.yml up --build -d
```
