#!/bin/bash

echo "Starting WaveFlow in LOCAL environment..."

# 환경 파일 복사
cp .env.local .env

# Docker Compose로 로컬 환경 시작
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up --build -d

echo "WaveFlow LOCAL environment is running!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8080"
echo "Database: localhost:5432"
echo ""
echo "To view logs: docker-compose -f docker-compose.local.yml logs -f"
echo "To stop: docker-compose -f docker-compose.local.yml down"
