#!/bin/bash

echo "Starting WaveFlow in DEVELOPMENT SERVER environment..."

# 환경 파일 복사
cp .env.development .env

# Docker Compose로 개발 서버 환경 시작
docker-compose -f docker-compose.development.yml down
docker-compose -f docker-compose.development.yml up --build -d

echo "WaveFlow DEVELOPMENT SERVER environment is running!"
echo "Frontend: http://13.125.231.115:3000"
echo "Backend: http://13.125.231.115:8080"
echo "Database: AWS RDS"
echo ""
echo "To view logs: docker-compose -f docker-compose.development.yml logs -f"
echo "To stop: docker-compose -f docker-compose.development.yml down"
