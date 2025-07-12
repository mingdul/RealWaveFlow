# 🚀 WaveFlow 팀 워크플로우 가이드

> **Honey Badgers 팀원을 위한 환경 전환 및 개발 워크플로우 완벽 가이드**

## 📋 목차
1. [시작하기 전에](#시작하기-전에)
2. [최초 설정](#최초-설정)
3. [일상적인 개발 워크플로우](#일상적인-개발-워크플로우)
4. [환경 전환 시나리오](#환경-전환-시나리오)
5. [문제 해결](#문제-해결)
6. [팁과 베스트 프랙티스](#팁과-베스트-프랙티스)

---

## 시작하기 전에.

### 필수 준비사항
- [ ] Docker Desktop 설치 및 실행
- [ ] Git 설치
- [ ] PowerShell (Windows) 또는 Terminal (Mac/Linux)
- [ ] 프로젝트 저장소 클론 완료

### 환경 이해하기
WaveFlow는 세 가지 환경을 제공합니다:

| 환경 | 용도 | 실행 위치 | 데이터베이스 | URL |
|------|------|----------|-------------|-----|
| **로컬** | 개인 개발 | 로컬 PC | 로컬 PostgreSQL | http://localhost:3000 |
| **로컬 개발서버** | 실제 DB 연동 테스트 | 로컬 PC | AWS RDS (공유) | http://localhost:3000 |
| **실제 배포서버** | CI/CD 자동 배포 | EC2 서버 | AWS RDS (공유) | http://13.125.231.115:3000 |

> ⚠️ **중요**: "로컬 개발서버"와 "실제 배포서버"는 같은 데이터베이스를 공유하지만 서로 다른 환경입니다!

---

## 최초 설정

### 1단계: 프로젝트 클론 및 환경 파일 설정
```bash
# 프로젝트 클론
git clone https://github.com/Team-Honey-Badgers/WaveFlow.git
cd WaveFlow

# 환경 파일 확인 (이미 설정되어 있음)
ls -la .env.*
```

### 2단계: 최초 로컬 환경 빌드
**Windows (PowerShell):**
```powershell
# 로컬 환경으로 시작 (최초 빌드 포함)
.\scripts\start-local.ps1
```

**Mac/Linux:**
```bash
# 로컬 환경으로 시작 (최초 빌드 포함)
pwsh #파워셀 실행
./scripts/start-local.sh
```

⏰ **예상 시간**: 5-10분 (최초 Docker 이미지 빌드)

### 3단계: 환경 확인
```powershell
# 환경 상태 확인
.\scripts\status.ps1
```

✅ **성공 시 표시되는 내용:**
- Current Environment: LOCAL
- All containers running
- Backend: Healthy
- Frontend: Healthy

---

## 일상적인 개발 워크플로우

### 🏠 로컬 개발 시작하기

#### 1. 로컬 환경 빠른 시작
```powershell
# Fast 모드 (5-10초) - 권장
.\scripts\start-local-fast.ps1

# 상태 확인
.\scripts\status.ps1
```

#### 2. 개발 시작
- 브라우저에서 http://localhost:3000 접속
- 백엔드 API 문서: http://localhost:8080/api
- 코드 수정 후 테스트

#### 3. 코드 변경 후 재빌드 (필요시)
```powershell
# 코드 변경이 있을 때만 사용
.\scripts\start-local.ps1
```

### 🌐 실제 DB 연동 테스트

#### 로컬 개발서버로 전환
```powershell
# 로컬 개발서버로 빠른 전환 (AWS RDS 사용)
.\scripts\start-dev-fast.ps1
```

- **용도**: 실제 데이터베이스와 연동된 테스트
- **접속**: http://localhost:3000 (로컬에서 실행되지만 실제 DB 사용)
- **주의**: 실제 배포서버와 같은 데이터베이스를 공유함

#### 실제 배포서버 사용하기

##### 배포 방법
```bash
# 1. ec2test 브랜치로 전환
git checkout ec2test

# 2. 최신 변경사항 병합
git merge your-feature-branch

# 3. 원격 저장소에 push (자동 배포 트리거)
git push origin ec2test
```

##### 배포 과정 모니터링
1. **GitHub Actions 확인**: [Actions 탭](https://github.com/Team-Honey-Badgers/WaveFlow/actions)에서 배포 진행상황 확인
2. **Slack 알림**: 배포 성공/실패 시 팀 채널에 자동 알림
3. **배포 완료**: 약 3-5분 후 서버에서 테스트 가능

##### 접속 및 테스트
- **프론트엔드**: http://13.125.231.115:3000
- **백엔드 API**: http://13.125.231.115:8080
- **API 문서**: http://13.125.231.115:8080/api

#### 다시 로컬로 돌아오기
```powershell
# 로컬로 빠른 전환
.\scripts\start-local-fast.ps1
```

---

## 환경 전환 시나리오

### 시나리오 1: 아침에 출근해서 개발 시작
```powershell
# 1. 로컬 환경으로 빠른 시작
.\scripts\start-local-fast.ps1

# 2. 상태 확인
.\scripts\status.ps1

# 3. 브라우저에서 http://localhost:3000 접속하여 개발 시작
```

### 시나리오 2: 실제 DB 연동 테스트
```powershell
# 1. 로컬 개발서버로 전환 (AWS RDS 연동)
.\scripts\start-dev-fast.ps1

# 2. 실제 데이터베이스와 연동된 기능 테스트
# 3. http://localhost:3000 에서 테스트 (실제 DB 사용)

# 4. 테스트 완료 후 로컬로 복귀
.\scripts\start-local-fast.ps1
```

### 시나리오 3: 팀 전체 배포 테스트
```bash
# 1. 기능 개발 완료 후 ec2test 브랜치에 배포
git checkout ec2test
git merge feature/your-feature
git push origin ec2test

# 2. GitHub Actions에서 자동 배포 진행 (3-5분)
# 3. Slack에서 배포 완료 알림 확인
# 4. 팀원들과 함께 실제 서버에서 테스트
#    - 프론트엔드: http://13.125.231.115:3000
#    - 백엔드: http://13.125.231.115:8080

# 5. 테스트 완료 후 다음 개발 진행
```

### 시나리오 4: 새로운 기능 개발 완료 후
```powershell
# 1. 코드 변경사항 반영을 위한 재빌드
.\scripts\start-local.ps1

# 2. 로컬 개발서버에서 실제 DB 연동 테스트
.\scripts\start-dev.ps1
```

### 시나리오 5: 하루 작업 종료
```powershell
# 환경 중지 (선택사항)
docker-compose -f docker-compose.local.yml down
```

---

## 문제 해결

### 자주 발생하는 문제들

#### 1. 컨테이너가 시작되지 않음
```powershell
# 로그 확인
docker-compose -f docker-compose.local.yml logs

# 강제 재빌드
.\scripts\start-local.ps1
```

#### 2. 포트 충돌 오류
```powershell
# 기존 컨테이너 정리
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.development.yml down

# 다시 시작
.\scripts\start-local-fast.ps1

# 사용중인 포트 확인
sudo lsof -nP -iTCP:5432 | grep LISTEN
# 포트 죽이기
 sudo kill -9 <PID>
 #다시 실행
```

#### 3. 데이터베이스 연결 오류
```powershell
# 로컬 환경 완전 재시작
docker-compose -f docker-compose.local.yml down -v
.\scripts\start-local.ps1
```

#### 4. 프론트엔드가 백엔드에 연결되지 않음
```powershell
# 환경 상태 확인
.\scripts\status.ps1

# 백엔드 로그 확인
docker-compose -f docker-compose.local.yml logs backend
```

### 긴급 복구 절차
```powershell
# 1. 모든 컨테이너 중지
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.development.yml down

# 2. 시스템 정리
docker system prune -f

# 3. 완전 재빌드
.\scripts\start-local.ps1
```

---

## 팁과 베스트 프랙티스

### ⚡ 효율적인 개발을 위한 팁

#### 1. Fast 모드를 기본으로 사용
```powershell
# 일반적인 환경 전환은 항상 Fast 모드 사용
.\scripts\start-local-fast.ps1
.\scripts\start-dev-fast.ps1

# 코드 변경 후에만 일반 모드 사용
.\scripts\start-local.ps1
```

#### 2. 상태 확인 습관화
```powershell
# 문제 발생 시 가장 먼저 실행
.\scripts\status.ps1
```

#### 3. 로그 모니터링
```powershell
# 실시간 로그 확인
docker-compose -f docker-compose.local.yml logs -f

# 특정 서비스만 확인
docker-compose -f docker-compose.local.yml logs -f backend
```

### 🔄 팀 협업 가이드라인

#### 1. 개발 서버 사용 예의
- 개발 서버 사용 전 팀원들에게 알림
- 테스트 완료 후 결과 공유
- 장시간 점유하지 않기

#### 2. 환경 사용 가이드라인

##### 로컬 환경 (localhost + 로컬 DB)
- **언제**: 일반적인 개발 작업
- **용도**: 빠른 개발 및 테스트
- **장점**: 빠른 응답, 독립적인 데이터

##### 로컬 개발서버 (localhost + AWS RDS)
- **언제**: 실제 데이터와 연동 테스트 필요시
- **용도**: DB 스키마 변경, 실제 데이터 테스트
- **주의**: 실제 DB 영향 가능

##### 실제 배포서버 (EC2 + AWS RDS)
- **언제**: 기능 완성 후 팀 전체 테스트
- **용도**: 최종 통합 테스트, 배포 전 검증
- **방법**: `ec2test` 브랜치에 push

#### 3. 코드 커밋 전 체크리스트
- [ ] 로컬 환경에서 정상 작동 확인
- [ ] 로컬 개발서버에서 실제 DB 연동 테스트 완료
- [ ] 실제 배포서버에서 최종 테스트 완료 (필요시)
- [ ] 로그에 에러 없음 확인

### 🛠 개발 도구 활용

#### 1. API 테스트
```powershell
# Swagger UI 사용
# 로컬: http://localhost:8080/api
# 개발서버: http://13.125.231.115:8080/api
```

#### 2. 데이터베이스 접근
```bash
# 로컬 PostgreSQL 접근
docker exec -it waveflow-postgres-local psql -U waveflow_user -d waveflow_local
```

#### 3. 실시간 개발
- 프론트엔드: 코드 변경 시 자동 새로고침
- 백엔드: 코드 변경 시 컨테이너 재시작 필요

---

## 📞 도움이 필요할 때

### 1차 해결 방법
1. `.\scripts\status.ps1` 실행
2. 로그 확인: `docker-compose -f docker-compose.local.yml logs`
3. 재시작: `.\scripts\start-local-fast.ps1`

### 2차 해결 방법
1. 완전 재빌드: `.\scripts\start-local.ps1`
2. 시스템 정리 후 재시작

### 팀원 지원 요청
- Slack에서 `#waveflow-dev` 채널에 문의
- 에러 로그와 함께 상황 설명
- 어떤 스크립트를 실행했는지 명시

---

## 🎯 요약: 개발 워크플로우

### 일반적인 개발 루틴
```powershell
# 🌅 출근 후 - 로컬 환경으로 시작
.\scripts\start-local-fast.ps1

# 🔨 개발 중 - 로컬에서 개발
# - http://localhost:3000 에서 개발
# - 코드 수정 및 테스트

# 🧪 실제 DB 테스트 필요시
.\scripts\start-dev-fast.ps1
# - http://localhost:3000 에서 실제 DB 연동 테스트

# 🏠 로컬 복귀
.\scripts\start-local-fast.ps1

# 🌙 퇴근 전 (선택사항)
docker-compose -f docker-compose.local.yml down
```

### 기능 완성 후 배포 루틴
```bash
# 1. 기능 개발 완료
# 2. 로컬 및 로컬 개발서버에서 테스트 완료

# 3. 실제 서버에 배포
git checkout ec2test
git merge feature/your-feature
git push origin ec2test

# 4. GitHub Actions 배포 완료 대기 (3-5분)
# 5. 팀원들과 함께 실제 서버에서 최종 테스트
#    http://13.125.231.115:3000

# 6. 테스트 완료 후 다음 기능 개발 진행
```

---

**Go, Badgers**

> 문제가 발생하면 당황하지 말고 이 가이드를 참고하세요. 대부분의 문제는 간단한 재시작으로 해결됩니다! 