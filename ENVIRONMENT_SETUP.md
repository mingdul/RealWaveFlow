# WaveFlow 환경 설정 가이드

## 환경 구분

### 1. 로컬 환경 (Local)
- **용도**: 개인 개발 및 테스트
- **데이터베이스**: 로컬 PostgreSQL (Docker)
- **S3**: 로컬/테스트용 버킷
- **URL**: http://localhost:3000

### 2. 개발 서버 환경 (Development)
- **용도**: 팀 공유 개발 및 통합 테스트
- **데이터베이스**: AWS RDS
- **S3**: 개발용 버킷 (waveflow-audio-honeybadgers)
- **URL**: http://13.125.231.115:3000
cd
## 환경 전환 방법

### 로컬 환경으로 전환

**일반 모드 (새로 빌드):**

Windows (PowerShell):
```powershell
.\scripts\start-local.ps1
```

Unix/Linux/macOS:
```bash
./scripts/start-local.sh
```

**⚡ Fast 모드 (기존 이미지 사용):**

Windows (PowerShell):
```powershell
.\scripts\start-local-fast.ps1
```

Unix/Linux/macOS:
```bash
./scripts/start-local-fast.sh
```

### 개발 서버 환경으로 전환

**일반 모드 (새로 빌드):**

Windows (PowerShell):
```powershell
.\scripts\start-dev.ps1
```

Unix/Linux/macOS:
```bash
./scripts/start-dev.sh
```

**⚡ Fast 모드 (기존 이미지 사용):**

Windows (PowerShell):
```powershell
.\scripts\start-dev-fast.ps1
```

Unix/Linux/macOS:
```bash
./scripts/start-dev-fast.sh
```

## 환경별 설정 파일

- `.env.local` - 로컬 환경 설정
- `.env.development` - 개발 서버 환경 설정
- `.env.example` - 설정 템플릿

## Fast 모드 vs 일반 모드

### ⚡ Fast 모드 (권장)
- **장점**: 빠른 환경 전환 (5-10초)
- **용도**: 코드 변경 없이 환경만 전환할 때
- **조건**: 기존에 빌드된 Docker 이미지가 있어야 함

### 🔧 일반 모드
- **장점**: 최신 코드 변경사항 반영
- **용도**: 코드 변경 후 새로 빌드가 필요할 때
- **시간**: 5-10분 (빌드 시간 포함)

## 주의사항

1. **환경 파일 보안**: `.env.local`과 `.env.development`는 실제 값으로 수정 후 `.gitignore`에 추가
2. **데이터베이스**: 로컬 환경은 독립적인 PostgreSQL 사용
3. **AWS 자격증명**: 환경별로 다른 IAM 사용자 사용 권장
4. **포트 충돌**: 로컬에서 PostgreSQL이 이미 실행 중이면 포트 변경 필요
5. **Fast 모드 사용 시**: 코드 변경사항이 있으면 일반 모드로 빌드 후 Fast 모드 사용

## 환경별 명령어

### 환경 상태 확인

**Windows (PowerShell):**
```powershell
.\scripts\status.ps1
```

**Unix/Linux/macOS:**
```bash
./scripts/status.sh
```

### 로그 확인
```bash
# 로컬 환경
docker-compose -f docker-compose.local.yml logs -f

# 개발 서버 환경
docker-compose -f docker-compose.development.yml logs -f
```

### 환경 중지
```bash
# 로컬 환경
docker-compose -f docker-compose.local.yml down

# 개발 서버 환경
docker-compose -f docker-compose.development.yml down
```

### 데이터베이스 초기화 (로컬만)
```bash
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up --build -d
```
