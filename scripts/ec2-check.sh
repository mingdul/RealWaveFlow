#!/bin/bash
# EC2 인스턴스 상태 확인 스크립트

echo "===== EC2 인스턴스 상태 확인 ====="

echo -e "\n===== Nginx 설정 확인 ====="
sudo cat /etc/nginx/sites-available/default

echo -e "\n===== Nginx 상태 확인 ====="
sudo systemctl status nginx

echo -e "\n===== Docker 컨테이너 상태 확인 ====="
sudo docker ps -a

echo -e "\n===== 프론트엔드 컨테이너 로그 확인 ====="
sudo docker logs waveflow-frontend

echo -e "\n===== 백엔드 컨테이너 로그 확인 ====="
sudo docker logs waveflow-backend

echo -e "\n===== Nginx 에러 로그 확인 ====="
sudo tail -n 50 /var/log/nginx/error.log

echo -e "\n===== 포트 사용 확인 ====="
sudo netstat -tulpn | grep -E '80|443|3000|8080'

echo -e "\n===== SSL 인증서 확인 ====="
sudo ls -la /etc/letsencrypt/live/waveflow.pro/

echo -e "\n===== 도메인 연결 테스트 ====="
curl -I https://waveflow.pro
