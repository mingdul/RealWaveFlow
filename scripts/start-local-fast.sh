#!/bin/bash

echo "Fast starting WaveFlow in LOCAL environment..."

# 환경 파일 복사
echo "Setting up environment file..."
cp .env.local .env

# 기존 컨테이너 중지 (빌드 없이)
echo "🔄 Switching to local environment..."
docker-compose -f docker-compose.development.yml down 2>/dev/null
docker-compose -f docker-compose.local.yml down 2>/dev/null

# 기존 이미지로 빠르게 시작 (--build 옵션 제외)
echo "Starting containers with existing images..."
docker-compose -f docker-compose.local.yml up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "WaveFlow LOCAL environment is running! (Fast mode)"
    echo "Frontend: http://localhost:3000"
    echo "Backend: http://localhost:8080"
    echo "Database: localhost:5432"
    echo ""
    echo "Fast mode: Using existing Docker images"
    echo "If you need to rebuild: ./scripts/start-local.sh"
    echo ""
    echo "To view logs: docker-compose -f docker-compose.local.yml logs -f"
    echo "To stop: docker-compose -f docker-compose.local.yml down"
    echo ""
    echo "Health Check:"
    
    # 잠시 대기 후 헬스체크
    sleep 5
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        echo "Backend is healthy!"
    else
        echo "Backend health check failed - containers may still be starting up"
        echo "Try: docker-compose -f docker-compose.local.yml logs backend"
    fi
else
    echo "Failed to start LOCAL environment (Fast mode)"
    echo "Try rebuilding: ./scripts/start-local.sh"
    echo "Check logs: docker-compose -f docker-compose.local.yml logs"
fi 