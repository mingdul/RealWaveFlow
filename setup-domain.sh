#!/bin/bash
# WaveFlow 도메인 설정 스크립트

echo "WaveFlow 도메인 설정을 시작합니다..."

# 1. EC2 Nginx 설정 업데이트
echo "Nginx 설정을 업데이트합니다..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
sudo cp ./ec2-nginx-config.conf /etc/nginx/sites-available/default

# 2. Nginx 설정 테스트
echo "Nginx 설정을 테스트합니다..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "Nginx 설정 테스트에 실패했습니다. 설정을 확인하세요."
    exit 1
fi

# 3. Nginx 재시작
echo "Nginx를 재시작합니다..."
sudo systemctl restart nginx

# 4. Docker Compose로 애플리케이션 재배포
echo "Docker Compose로 애플리케이션을 재배포합니다..."
docker-compose down
docker-compose -f docker-compose.production.yml up -d

echo "도메인 설정이 완료되었습니다!"
echo "브라우저에서 https://waveflow.pro에 접속하여 테스트하세요."

# 5. SSL 인증서 자동 갱신 테스트
echo "SSL 인증서 자동 갱신을 테스트합니다..."
sudo certbot renew --dry-run

echo "설정이 완료되었습니다!"
