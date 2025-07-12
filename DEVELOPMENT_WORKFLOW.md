# WaveFlow 개발 워크플로우

## 🎯 우리 팀의 개발 방식

### 브랜치 구조 (매우 간단!)
```
master
└── ec2test (기존 Q 브랜치)
```

**그게 전부입니다!** 복잡한 develop, staging, feature 브랜치 없음! 🎉

## 🔄 일상적인 개발 과정

### 월요일: 새로운 기능 개발 시작
```bash
git checkout ec2test
git pull origin ec2test
# 코드 작성...
git add .
git commit -m "feat: 사용자 인증 기능 추가"
git push origin ec2test
```
→ **자동으로 EC2에 배포됨!**
→ **Slack에 "배포 완료" 알림**
→ **팀원들이 실서버에서 테스트**

### 화요일: 버그 수정
```bash
git checkout ec2test
git pull origin ec2test  # 다른 팀원 변경사항 받기
# 버그 수정...
git add .
git commit -m "fix: 로그인 오류 수정"
git push origin ec2test
```
→ **다시 자동 배포**
→ **팀원들이 버그 수정 확인**

### 금요일: 한 주 작업 완료
```bash
# 충분한 테스트 완료 후
git checkout master
git pull origin master
git merge ec2test
git push origin master
```
→ **이번 주 작업을 안정 버전으로 저장**

## 🧪 실서버 테스트 방법

### 배포 완료 후 할 일
1. **Slack 알림 확인**: "🧪 개발 서버 배포 성공!"
2. **브라우저에서 접속**:
   - Frontend: `http://EC2주소:3000`
   - Backend API: `http://EC2주소:8080`
   - API 문서: `http://EC2주소:8080/api`

### 테스트 항목
- [ ] 페이지가 정상적으로 로드되는가?
- [ ] 새로 추가한 기능이 동작하는가?
- [ ] 데이터베이스에 데이터가 저장되는가?
- [ ] 파일 업로드가 S3에 정상적으로 되는가?
- [ ] 다른 기능들이 여전히 잘 동작하는가?

## 👥 팀 협업 규칙

### 🟢 좋은 습관
```bash
# 작업 시작 전 항상 최신 코드 받기
git checkout ec2test
git pull origin ec2test

# 의미있는 커밋 메시지
git commit -m "feat: 트랙 업로드 기능 추가"
git commit -m "fix: 파일 다운로드 오류 수정"
git commit -m "style: 메인 페이지 UI 개선"
```

### 🔴 피해야 할 것
- 다른 팀원이 테스트 중일 때 갑자기 푸시하기
- 테스트 없이 master 브랜치에 직접 푸시
- 큰 변경사항을 팀에게 알리지 않고 푸시

### 💬 소통 방법
```
Slack에서:
"지금 로그인 기능 테스트 중이니까 10분 후에 푸시해주세요!"
"파일 업로드 기능 추가했어요. 테스트해보세요!"
"오류 수정 완료! 다시 테스트 가능합니다."
```

## 🔧 문제 상황 대처법

### 배포 실패 시
1. **GitHub Actions 확인**: Repository → Actions 탭
2. **오류 로그 확인**: 빨간색 X 표시 클릭
3. **팀에게 알림**: "배포 실패했어요, 확인 중입니다"
4. **문제 해결 후 다시 푸시..**

### 서버 오류 시
```bash
# 직접 서버 접속해서 확인
ssh -i key.pem ubuntu@EC2주소

# 컨테이너 상태 보기
sudo docker-compose ps

# 오류 로그 보기
sudo docker-compose logs backend
```

### 긴급 롤백
```bash
# 이전 버전으로 되돌리기
git checkout ec2test
git reset --hard HEAD~1
git push origin ec2test --force
```

## 📅 주간 루틴

### 매주 금요일
- [ ] 이번 주 작업 내용 정리
- [ ] 충분한 테스트 완료 확인
- [ ] `master` 브랜치로 머지
- [ ] 다음 주 계획 논의

### 매주 월요일
- [ ] `ec2test` 브랜치에서 새로운 작업 시작
- [ ] 지난 주 이슈 사항 점검

## 🎯 핵심 포인트

**우리 CI/CD의 목적**:
- ✅ 로컬이 아닌 실제 서버에서 테스트
- ✅ RDS, S3 연동 확인
- ✅ 팀원들이 함께 테스트 가능
- ✅ 자동화로 배포 실수 방지

**매우 간단한 과정**:
1. 코드 작성 → `ec2test`에 푸시
2. 자동 배포 → 실서버 테스트
3. 테스트 완료 → `master`로 머지

**그게 전부입니다!** 🚀
