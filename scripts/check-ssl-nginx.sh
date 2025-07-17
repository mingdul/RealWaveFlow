#!/bin/bash
# SSL 인증서와 Nginx 설정 확인 스크립트

echo "===== SSL 인증서 확인 ====="
sudo certbot certificates

echo -e "\n===== Nginx 설정 확인 ====="
sudo cat /etc/nginx/sites-available/default

echo -e "\n===== 활성화된 Nginx 사이트 확인 ====="
sudo ls -la /etc/nginx/sites-enabled/

echo -e "\n===== Nginx 상태 확인 ====="
sudo systemctl status nginx

echo -e "\n===== www 서브도메인 테스트 ====="
curl -I https://www.waveflow.pro

echo -e "\n===== 루트 도메인 테스트 ====="
curl -I https://waveflow.pro
