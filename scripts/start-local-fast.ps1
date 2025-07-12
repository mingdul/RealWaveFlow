# WaveFlow Local Environment Fast Startup Script for Windows
Write-Host "Fast starting WaveFlow in LOCAL environment..." -ForegroundColor Green

# 환경 파일 복사
Write-Host "Setting up environment file..." -ForegroundColor Yellow
Copy-Item .env.local .env -Force

# 기존 컨테이너 중지 (빌드 없이)
Write-Host "Switching to local environment..." -ForegroundColor Yellow
docker-compose -f docker-compose.development.yml down 2>$null
docker-compose -f docker-compose.local.yml down 2>$null

# 기존 이미지로 빠르게 시작 (--build 옵션 제외)
Write-Host "Starting containers with existing images..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "WaveFlow LOCAL environment is running! (Fast mode)" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "Database: localhost:5432" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Fast mode: Using existing Docker images" -ForegroundColor Magenta
    Write-Host "If you need to rebuild: .\scripts\start-local.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "To view logs: docker-compose -f docker-compose.local.yml logs -f" -ForegroundColor White
    Write-Host "To stop: docker-compose -f docker-compose.local.yml down" -ForegroundColor White
    Write-Host ""
    Write-Host "Health Check:" -ForegroundColor Yellow
    
    # 잠시 대기 후 헬스체크
    Start-Sleep -Seconds 5
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend is healthy!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Backend health check failed - containers may still be starting up" -ForegroundColor Yellow
        Write-Host "Try: docker-compose -f docker-compose.local.yml logs backend" -ForegroundColor White
    }
} else {
    Write-Host "Failed to start LOCAL environment (Fast mode)" -ForegroundColor Red
    Write-Host "Try rebuilding: .\scripts\start-local.ps1" -ForegroundColor Yellow
    Write-Host "Check logs: docker-compose -f docker-compose.local.yml logs" -ForegroundColor White
} 