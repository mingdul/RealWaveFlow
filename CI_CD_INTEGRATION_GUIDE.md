# WaveFlow CI/CD 사용 가이드

## 🎯 우리 팀의 개발 환경

### 현재 브랜치 구조
```
master ← 최종 안정 버전 (테스트 완료 후)
└── ec2test ← 개발 테스트용 (실서버 자동 배포)
```

### 서버 환경
- **개발 테스트 서버**: 현재 EC2 (RDS, S3 연동됨)
- **배포 방식**: GitHub Actions 자동 배포
- **목적**: 로컬이 아닌 실제 서버에서 RDS, S3 연동 테스트

## 🚀 개발 워크플로우 (매우 간단!)

### 1. 코드 개발 및 푸시
```bash
# ec2test 브랜치에서 개발
git checkout ec2test
git pull origin ec2test

# 코드 작성 후
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin ec2test  # 👈 이 순간 자동 배포 시작!
```

### 2. 자동 배포 (GitHub Actions)
- 푸시하는 순간 GitHub Actions가 자동 실행
- EC2 서버에 최신 코드 배포
- Docker 컨테이너 재시작
- Slack에 배포 완료 알림

### 3. 실서버 테스트
```bash
# 팀원들이 접속해서 테스트
Backend:  http://EC2주소:8080
Frontend: http://EC2주소:3000
API문서:  http://EC2주소:8080/api
```

### 4. 테스트 완료 후 master 브랜치로 이동
```bash
# 충분한 테스트 완료 후
git checkout master
git pull origin master
git merge ec2test
git push origin master  # 최종 안정 버전으로 저장
```

## 🧪 테스트 체크리스트

### 백엔드 테스트
- [ ] 서버 시작 확인: `http://EC2주소:8080/health`
- [ ] 데이터베이스 연결 확인 (RDS PostgreSQL)
- [ ] API 엔드포인트 동작 확인
- [ ] S3 파일 업로드/다운로드 테스트
- [ ] 로그에서 에러 없는지 확인

### 프론트엔드 테스트
- [ ] 페이지 로딩: `http://EC2주소:3000`
- [ ] 백엔드 API 통신 확인
- [ ] 사용자 인터페이스 동작 확인
- [ ] 파일 업로드 기능 테스트

## 🔧 문제 해결

### 배포 실패 시
1. GitHub Actions 탭에서 로그 확인
2. Slack에서 오류 메시지 확인
3. 팀에게 알리고 함께 해결

### 서버 오류 시
```bash
# EC2에 SSH 접속
ssh -i your-key.pem ubuntu@EC2주소

# 컨테이너 상태 확인
sudo docker-compose ps

# 로그 확인
sudo docker-compose logs backend
sudo docker-compose logs frontend
```

## 📢 팀 규칙

### ✅ 해야 할 것
- ec2test 브랜치에 푸시하기 전에 로컬에서 기본 테스트
- 배포 후 Slack 알림 확인하기
- 중요한 변경사항은 팀에게 미리 알리기
- 테스트 완료 후 master 브랜치로 머지하기

### ❌ 하지 말아야 할 것
- master 브랜치에 직접 푸시 (테스트 없이)
- 다른 팀원이 테스트 중일 때 무작정 푸시
- .env 파일이나 비밀키 커밋하기

## 🆘 긴급 상황

### 서버가 다운된 경우
1. Slack에서 팀에게 즉시 알림
2. 이전 안정 버전으로 롤백:
   ```bash
   git checkout ec2test
   git reset --hard HEAD~1  # 이전 커밋으로 되돌리기
   git push origin ec2test --force
   ```

## 📝 요약

**우리 팀의 CI/CD는 매우 간단합니다:**

1. `ec2test` 브랜치에 푸시 → 자동 배포
2. 실서버에서 RDS, S3 연동 테스트
3. 문제없으면 `master` 브랜치로 머지

**목적**: 로컬 환경이 아닌 실제 서버 환경에서 안전하게 테스트하기! 🎯
