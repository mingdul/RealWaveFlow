# WaveFlow 도메인 설정 가이드

이 문서는 WaveFlow 애플리케이션에 도메인을 연결하는 방법을 설명합니다.

## 사전 준비

1. 도메인 구매 완료 (waveflow.pro)
2. EC2 인스턴스 실행 중
3. Docker와 Docker Compose 설치됨

## 도메인 연결 단계

### 1. DNS 설정

도메인 제공업체의 DNS 설정에서 다음과 같이 설정하세요:
- A 레코드: waveflow.pro → EC2 인스턴스 IP 주소
- A 레코드: www.waveflow.pro → EC2 인스턴스 IP 주소

### 2. SSL 인증서 발급

EC2 인스턴스에서 다음 명령어를 실행하여 SSL 인증서를 발급받으세요:

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d waveflow.pro -d www.waveflow.pro
```

### 3. EC2 Nginx 설정

EC2 인스턴스의 Nginx 설정을 업데이트하세요:

```bash
# 기존 설정 백업
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# 새 설정 적용
sudo cp ./ec2-nginx-config.conf /etc/nginx/sites-available/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 4. 환경 변수 업데이트

`.env` 파일에서 다음 변수를 업데이트하세요:

```
FRONTEND_URL=https://waveflow.pro
VITE_API_URL=https://waveflow.pro/api
GOOGLE_CALLBACK_URL=https://waveflow.pro/auth/google/callback
```

참고: `.env.domain.example` 파일을 참조하여 환경 변수를 설정할 수 있습니다.

### 5. Nginx 설정 파일 업데이트

프로젝트의 Nginx 설정 파일을 도메인 설정으로 업데이트했습니다:
- `frontend/nginx.conf`
- `frontend/nginx.local.conf`

이 파일들은 Docker 컨테이너 내부의 Nginx 설정을 담당합니다.

### 6. Docker Compose로 애플리케이션 재시작

```bash
# 기존 컨테이너 중지
docker-compose down

# 컨테이너 재시작
docker-compose -f docker-compose.local.yml up -d
```

### 7. 도메인 연결 테스트

브라우저에서 다음 URL에 접속하여 테스트하세요:
- https://waveflow.pro
- https://www.waveflow.pro

## 자동 갱신 설정

SSL 인증서 자동 갱신 테스트:

```bash
sudo certbot renew --dry-run
```

## 문제 해결

1. **Nginx 오류 확인**: `sudo nginx -t`
2. **로그 확인**: `sudo tail -f /var/log/nginx/error.log`
3. **Docker 로그 확인**: `docker logs waveflow-frontend`

## 참고 사항

- 현재는 개발 환경에서만 도메인을 사용합니다.
- 추후 프로덕션 환경이 필요할 때 별도로 구성할 예정입니다.
