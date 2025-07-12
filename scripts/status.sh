#!/bin/bash

echo "WaveFlow Environment Status"
echo "================================"
echo ""

# 현재 환경 파일 확인
if [ -f ".env" ]; then
    if grep -q "DB_HOST=postgres" .env; then
        echo "Current Environment: LOCAL"
        current_env="local"
    elif grep -q "DB_HOST=" .env; then
        echo "Current Environment: DEVELOPMENT SERVER"
        current_env="development"
    else
        echo "Current Environment: UNKNOWN"
        current_env="unknown"
    fi
else
    echo "Current Environment: NOT SET"
    current_env="none"
fi

echo ""

# Docker 컨테이너 상태 확인
echo "Docker Containers Status:"

if [ "$current_env" = "local" ]; then
    containers=$(docker-compose -f docker-compose.local.yml ps 2>/dev/null)
elif [ "$current_env" = "development" ]; then
    containers=$(docker-compose -f docker-compose.development.yml ps 2>/dev/null)
else
    containers=""
fi

if [ -n "$containers" ]; then
    echo "$containers"
else
    echo "No containers running"
fi

echo ""

# 서비스 헬스체크
echo "Services Health Check:"

if [ "$current_env" = "local" ]; then
    frontend_url="http://localhost:3000"
    backend_url="http://localhost:8080/health"
elif [ "$current_env" = "development" ]; then
    frontend_url="http://13.125.231.115:3000"
backend_url="http://13.125.231.115:8080/health"
else
    frontend_url=""
    backend_url=""
fi

if [ -n "$backend_url" ]; then
    if curl -f "$backend_url" >/dev/null 2>&1; then
        echo "Backend: Healthy"
    else
        echo "Backend: Not responding"
    fi

    if curl -f "$frontend_url" >/dev/null 2>&1; then
        echo "Frontend: Healthy"
    else
        echo "Frontend: Not responding"
    fi
else
    echo "No environment set for health check"
fi

echo ""

# 유용한 명령어 제안
echo "Quick Actions:"
if [ "$current_env" = "local" ]; then
    echo "   Switch to Dev:  ./scripts/start-dev-fast.sh"
    echo "   View logs:      docker-compose -f docker-compose.local.yml logs -f"
    echo "   Stop:           docker-compose -f docker-compose.local.yml down"
elif [ "$current_env" = "development" ]; then
    echo "   Switch to Local: ./scripts/start-local-fast.sh"
    echo "   View logs:       docker-compose -f docker-compose.development.yml logs -f"
    echo "   Stop:            docker-compose -f docker-compose.development.yml down"
else
    echo "   Start Local:     ./scripts/start-local-fast.sh"
    echo "   Start Dev:       ./scripts/start-dev-fast.sh"
fi

echo "" 