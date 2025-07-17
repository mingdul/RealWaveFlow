#!/bin/bash
# WaveFlow Nginx 설정 스크립트

echo "WaveFlow Nginx 설정을 시작합니다..."

# Nginx 설정 파일 생성
cat > ./nginx-waveflow.conf << 'EOF'
server {
    listen 80;
    server_name waveflow.pro www.waveflow.pro;
    
    # HTTP에서 HTTPS로 리다이렉션
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name waveflow.pro www.waveflow.pro;
    
    # SSL 인증서 설정 (Certbot이 자동으로 설정함)
    ssl_certificate /etc/letsencrypt/live/waveflow.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/waveflow.pro/privkey.pem;
    
    # Docker 컨테이너로 프록시
    location / {
        proxy_pass http://localhost:3000;  # 프론트엔드 컨테이너 포트
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:8080/;  # 백엔드 컨테이너 포트
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Nginx 설정 적용
sudo cp ./nginx-waveflow.conf /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl restart nginx

echo "✅ Nginx 설정이 완료되었습니다!"
echo "https://waveflow.pro 에서 사이트를 확인하세요."
