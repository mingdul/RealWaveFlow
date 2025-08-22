# 🚀 WaveFlow 로컬 환경에서 AWS 서비스 연결 가이드

> **팀원들이 CI/CD 배포를 기다리지 않고 로컬에서 실제 AWS 서비스를 테스트할 수 있는 환경 설정 가이드**

## 📋 목차
1. [개요](#개요)
2. [아키텍처 설명](#아키텍처-설명)
3. [환경 설정 단계](#환경-설정-단계)
4. [환경 전환 방법](#환경-전환-방법)
5. [문제 해결](#문제-해결)
6. [자주 묻는 질문](#자주-묻는-질문)

---

## 🎯 개요

### 목표
- **로컬 환경에서도 AWS S3, RDS, EC2 등과 연결**
- **실제 서비스와 동일한 환경에서 개발 및 테스트**
- **팀원들이 독립적으로 개발할 수 있는 환경 제공**

### 장점
- ✅ **빠른 개발**: CI/CD 배포 대기 시간 없음
- ✅ **실제 환경**: 실제 AWS 서비스와 동일한 동작
- ✅ **독립 개발**: 다른 팀원의 배포에 영향받지 않음
- ✅ **비용 절약**: 로컬에서 테스트 후 배포

---

## 🏗️ 아키텍처 설명

### 기존 구조
```
로컬 개발자 → EC2 서버 → AWS RDS/S3
```

### 새로운 구조 (로컬 AWS 연결)
```
로컬 개발자 → SSH 터널 → EC2 → AWS RDS/S3
                ↓
            로컬 포트 25432
```

### 환경별 데이터베이스 연결
| 환경 | DB_HOST | DB_PORT | 설명 |
|------|----------|---------|------|
| **로컬 (기존)** | postgres | 5432 | 로컬 PostgreSQL |
| **로컬 (AWS 연결)** | localhost | 25432 | SSH 터널을 통한 AWS RDS |
| **개발 서버** | waveflow-db... | 5432 | AWS RDS 직접 연결 |

---

## 🔧 환경 설정 단계

### 1단계: 환경 설정 파일 생성

#### Linux/Mac
```bash
# 스크립트 실행 권한 부여
chmod +x scripts/setup-env.sh

# 환경 설정 파일 생성
./scripts/setup-env.sh
```

#### Windows PowerShell
```powershell
# 환경 설정 파일 생성
.\scripts\setup-env.ps1
```

### 2단계: AWS 자격증명 설정

`.env.local` 파일에서 다음 값들을 실제 값으로 변경:

```env
# AWS 자격증명 (필수)
AWS_ACCESS_KEY_ID=AKIA...실제_액세스_키
AWS_SECRET_ACCESS_KEY=실제_시크릿_키

# 이메일 서비스 (필수)
RESEND_API_KEY=re_실제_리센드_키

# JWT 시크릿 (필수)
JWT_SECRET=실제_JWT_시크릿_키

# Google OAuth (선택사항)
GOOGLE_CLIENT_ID=실제_구글_클라이언트_ID
GOOGLE_CLIENT_SECRET=실제_구글_시크릿
```

### 3단계: SSH 터널 실행

```bash
# SSH 터널 시작 (백그라운드에서 실행)
./start-ssh-tunnel.sh

# 터미널을 새로 열어서 계속 작업
```

---

## 🔄 환경 전환 방법

### 로컬 환경 (AWS 연결) 시작

#### Linux/Mac
```bash
# 일반 모드 (새로 빌드)
./scripts/start-local.sh

# Fast 모드 (기존 이미지 사용)
./scripts/start-local-fast.sh
```

#### Windows PowerShell
```powershell
# 일반 모드 (새로 빌드)
.\scripts\start-local.ps1

# Fast 모드 (기존 이미지 사용)
.\scripts\start-local-fast.ps1
```

### 개발 서버 환경으로 전환

#### Linux/Mac
```bash
# 일반 모드
./scripts/start-dev.sh

# Fast 모드
./scripts/start-dev-fast.sh
```

#### Windows PowerShell
```powershell
# 일반 모드
.\scripts\start-dev.ps1

# Fast 모드
.\scripts\start-dev-fast.ps1
```

### 환경 상태 확인

```bash
# Linux/Mac
./scripts/status.sh

# Windows PowerShell
.\scripts\status.ps1
```

---

## 🚨 문제 해결

### SSH 터널 연결 실패

#### 문제: SSH 키 파일 경로 오류
```bash
# start-ssh-tunnel.sh 파일에서 키 경로 확인
ssh -i /c/Workspace/KEYPAIR/devWaveFlow.pem ...

# Windows에서 실제 키 경로로 수정
ssh -i C:\Users\사용자명\.ssh\devWaveFlow.pem ...
```

#### 문제: 포트 25432 이미 사용 중
```bash
# 포트 사용 확인
netstat -tulpn | grep 25432

# 다른 포트 사용 (예: 25433)
# start-ssh-tunnel.sh와 .env.local 파일 수정
```

### 데이터베이스 연결 실패

#### 문제: SSH 터널이 실행되지 않음
```bash
# SSH 터널 상태 확인
ps aux | grep "ssh.*25432"

# 터널 재시작
./start-ssh-tunnel.sh
```

#### 문제: AWS RDS 접근 권한 없음
```bash
# IAM 사용자 권한 확인
# RDS, S3 접근 권한이 있는지 확인
```

### S3 연결 실패

#### 문제: S3 버킷 접근 권한 없음
```bash
# IAM 정책 확인
# s3:GetObject, s3:PutObject 권한 필요
```

---

## ❓ 자주 묻는 질문

### Q: SSH 터널을 끊으면 어떻게 되나요?
**A**: 데이터베이스 연결이 끊어집니다. 터널을 계속 유지해야 합니다.

### Q: 다른 포트를 사용할 수 있나요?
**A**: 네, `start-ssh-tunnel.sh`와 `.env.local` 파일에서 포트를 변경하면 됩니다.

### Q: AWS 비용이 발생하나요?
**A**: RDS와 S3 사용량에 따라 비용이 발생합니다. 개발용으로만 사용하세요.

### Q: 팀원들과 같은 데이터를 공유하나요?
**A**: 네, AWS RDS를 공유하므로 데이터가 동기화됩니다.

### Q: 로컬 PostgreSQL과 AWS RDS를 동시에 사용할 수 있나요?
**A**: 아니요, 한 번에 하나의 환경만 사용 가능합니다.

---

## 📚 추가 리소스

- [AWS IAM 사용자 생성 가이드](https://docs.aws.amazon.com/iam/latest/userguide/id_users_create.html)
- [SSH 터널 설정 가이드](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.ssh.html)
- [WaveFlow 환경 설정 가이드](./ENVIRONMENT_SETUP.md)

---

## 🎉 완료!

이제 로컬 환경에서도 AWS 서비스와 연결되어 실제 서비스를 테스트할 수 있습니다!

**다음 단계:**
1. 환경 설정 완료
2. SSH 터널 실행
3. 로컬 환경 시작
4. AWS 서비스 테스트

**문제가 있으면 팀 채널에 문의하세요!** 🚀
