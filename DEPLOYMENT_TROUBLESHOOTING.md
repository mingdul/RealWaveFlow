# WaveFlow 배포 문제 해결 가이드

## 🚨 자주 발생하는 문제들

### 1. 데이터베이스 연결 실패

#### 증상
```
password authentication failed for user "admin_badger"
Unable to connect to the database
```

#### 체크리스트
- [ ] RDS 비밀번호에 shell 특수문자(`$`, `\`, `` ` ``) 포함 여부
- [ ] GitHub Secrets의 `DB_PASSWORD` 값 정확성
- [ ] `DB_NAME`이 `postgres`로 설정되어 있는지 확인
- [ ] RDS SSL 설정과 애플리케이션 SSL 설정 일치 여부

#### 해결 방법
1. **비밀번호 특수문자 문제**:
   ```bash
   # AWS CLI로 비밀번호 로테이션
   aws secretsmanager rotate-secret --secret-id [SECRET_ARN] --region ap-northeast-2
   ```

2. **SSL 설정 문제**:
   ```typescript
   // database.config.ts
   ssl: {
     rejectUnauthorized: false
   }
   ```

### 2. 환경변수 전달 문제

#### 증상
```
The "oc9" variable is not set. Defaulting to a blank string.
DB_PASSWORD length: 24 (예상: 29)
```

#### 해결 방법
```yaml
# GitHub Actions에서 heredoc 사용
cat > ./backend/.env << 'ENVEOF'
DB_PASSWORD=${{ secrets.DB_PASSWORD }}
ENVEOF
```

### 3. Docker 헬스체크 실패

#### 증상
```
Container waveflow-backend is unhealthy
dependency failed to start
```

#### 해결 방법
1. **임시**: 헬스체크 비활성화
2. **장기**: 헬스체크 조건 완화
   ```yaml
   healthcheck:
     test: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
     interval: 45s
     timeout: 20s
     retries: 15
     start_period: 180s
   ```

## 🔧 디버깅 도구

### 환경변수 확인
```bash
# 컨테이너 내부 환경변수 확인
sudo docker exec waveflow-backend env | grep DB_

# .env 파일 내용 확인
sudo docker exec waveflow-backend cat /app/.env
```

### 데이터베이스 연결 테스트
```bash
# PostgreSQL 클라이언트로 직접 연결
PGPASSWORD='[PASSWORD]' psql -h [HOST] -U [USER] -d [DATABASE] -c "SELECT version();"
```

### 로그 확인
```bash
# 백엔드 컨테이너 로그
sudo docker-compose logs --tail=50 backend

# 모든 컨테이너 상태
sudo docker-compose ps
```

## 📋 배포 전 체크리스트

### GitHub Secrets 검증
- [ ] `DB_HOST`: RDS 엔드포인트 주소
- [ ] `DB_PORT`: `5432`
- [ ] `DB_USERNAME`: `admin_badger`
- [ ] `DB_PASSWORD`: 특수문자 확인 (`$` 없는지)
- [ ] `DB_NAME`: `postgres` (사용자명 아님!)

### 파일 설정 검증
- [ ] `docker-compose.yml`: 포트 매핑 확인
- [ ] `database.config.ts`: SSL 설정 포함
- [ ] `.github/workflows/deploy.yml`: heredoc 방식 사용

### AWS 리소스 확인
- [ ] RDS 인스턴스 상태: `available`
- [ ] 보안 그룹: PostgreSQL 포트(5432) 허용
- [ ] 파라미터 그룹: `rds.force_ssl=0` 설정

## 🚀 성공적인 배포 로그 예시

```
🚀 Starting WaveFlow backend...
Environment: production
Database Host: waveflow-db.choksamgu9ms.ap-northeast-2.rds.amazonaws.com
Database Port: 5432
Database Name: postgres
Database User: admin_badger
[Nest] 1  - LOG [NestFactory] Starting Nest application...
[Nest] 1  - LOG [TypeOrmModule] Database connection established
🚀 Server running on http://localhost:3000
✅ WaveFlow backend started successfully!
```

## 📞 긴급 상황 대응

### 배포 실패 시
1. GitHub Actions 로그 확인
2. EC2에서 컨테이너 로그 확인: `sudo docker-compose logs backend`
3. 환경변수 값 검증
4. 필요시 이전 버전으로 롤백

### 데이터베이스 연결 불가 시
1. RDS 인스턴스 상태 확인
2. 보안 그룹 규칙 확인
3. 비밀번호 로테이션 고려
4. SSL 설정 재검토

---
**마지막 업데이트**: 2025-07-01
**작성자**: KE-GAM
