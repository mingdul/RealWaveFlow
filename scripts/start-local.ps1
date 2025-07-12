# WaveFlow Local Environment Startup Script for Windows
Write-Host "Starting WaveFlow in LOCAL environment..." -ForegroundColor Green

# 환경 파일 복사
Write-Host "Setting up environment file..." -ForegroundColor Yellow
Copy-Item .env.local .env -Force

# Docker Compose로 로컬 환경 시작
Write-Host "Starting Docker containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "WaveFlow LOCAL environment is running!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "Database: localhost:5432" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To view logs: docker-compose -f docker-compose.local.yml logs -f" -ForegroundColor White
    Write-Host "To stop: docker-compose -f docker-compose.local.yml down" -ForegroundColor White
    Write-Host ""
    Write-Host "Health Check:" -ForegroundColor Yellow
    
    # 잠시 대기 후 헬스체크
    Start-Sleep -Seconds 10
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend is healthy!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Backend health check failed - containers may still be starting up" -ForegroundColor Yellow
    }
} else {
    Write-Host "Failed to start LOCAL environment" -ForegroundColor Red
    Write-Host "Check logs: docker-compose -f docker-compose.local.yml logs" -ForegroundColor White
} 