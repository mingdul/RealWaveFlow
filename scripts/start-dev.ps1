# WaveFlow Development Server Startup Script for Windows
Write-Host "Starting WaveFlow in DEVELOPMENT SERVER environment..." -ForegroundColor Green

# 환경 파일 복사
Write-Host "Setting up environment file..." -ForegroundColor Yellow
Copy-Item .env.development .env -Force

# Docker Compose로 개발 서버 환경 시작
Write-Host "Starting Docker containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.development.yml down
docker-compose -f docker-compose.development.yml up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "WaveFlow DEVELOPMENT SERVER environment is running!" -ForegroundColor Green
    Write-Host "Frontend: http://13.125.231.115:3000" -ForegroundColor Cyan
Write-Host "Backend: http://13.125.231.115:8080" -ForegroundColor Cyan
    Write-Host "Database: AWS RDS" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To view logs: docker-compose -f docker-compose.development.yml logs -f" -ForegroundColor White
    Write-Host "To stop: docker-compose -f docker-compose.development.yml down" -ForegroundColor White
    Write-Host ""
    Write-Host "Health Check:" -ForegroundColor Yellow
    
    # 잠시 대기 후 헬스체크
    Start-Sleep -Seconds 10
          try {
          $response = Invoke-WebRequest -Uri "http://13.125.231.115:8080/health" -Method GET -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend is healthy!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Backend health check failed - containers may still be starting up" -ForegroundColor Yellow
    }
} else {
    Write-Host "Failed to start DEVELOPMENT SERVER environment" -ForegroundColor Red
    Write-Host "Check logs: docker-compose -f docker-compose.development.yml logs" -ForegroundColor White
} 