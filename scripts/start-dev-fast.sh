#!/bin/bash

echo "Fast starting WaveFlow in DEVELOPMENT SERVER environment..."

# 환경 파일 복사
echo "Setting up environment file..."
cp .env.development .env

# 기존 컨테이너 중지 (빌드 없이)
echo "Switching to development server environment..."
docker-compose -f docker-compose.local.yml down 2>/dev/null
docker-compose -f docker-compose.development.yml down 2>/dev/null

# 기존 이미지로 빠르게 시작 (--build 옵션 제외)
echo "Starting containers with existing images..."
docker-compose -f docker-compose.development.yml up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "WaveFlow DEVELOPMENT SERVER environment is running! (Fast mode)"
    echo "Frontend: http://13.125.231.115:3000"
echo "Backend: http://13.125.231.115:8080"
    echo "Database: AWS RDS"
    echo ""
    echo "Fast mode: Using existing Docker images"
    echo "If you need to rebuild: ./scripts/start-dev.sh"
    echo ""
    echo "To view logs: docker-compose -f docker-compose.development.yml logs -f"
    echo "To stop: docker-compose -f docker-compose.development.yml down"
    echo ""
    echo "Health Check:"
    
    # 잠시 대기 후 헬스체크
    sleep 5
    if curl -f http://13.125.231.115:8080/health >/dev/null 2>&1; then
        echo "Backend is healthy!"
    else
        echo "Backend health check failed - containers may still be starting up"
        echo "Try: docker-compose -f docker-compose.development.yml logs backend"
    fi
else
    echo "Failed to start DEVELOPMENT SERVER environment (Fast mode)"
    echo "Try rebuilding: ./scripts/start-dev.sh"
    echo "Check logs: docker-compose -f docker-compose.development.yml logs"
fi 