# WaveFlow Environment Status Check Script
Write-Host "🔍 WaveFlow Environment Status" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# 현재 환경 파일 확인
if (Test-Path ".env") {
    $envContent = Get-Content ".env" | Where-Object { $_ -match "DB_HOST=" }
    if ($envContent -match "DB_HOST=postgres") {
        Write-Host "Current Environment: LOCAL" -ForegroundColor Cyan
        $currentEnv = "local"
    } elseif ($envContent -match "DB_HOST=") {
        Write-Host "Current Environment: DEVELOPMENT SERVER" -ForegroundColor Cyan
        $currentEnv = "development"
    } else {
        Write-Host "Current Environment: UNKNOWN" -ForegroundColor Yellow
        $currentEnv = "unknown"
    }
} else {
    Write-Host "Current Environment: NOT SET" -ForegroundColor Red
    $currentEnv = "none"
}

Write-Host ""

# Docker 컨테이너 상태 확인
Write-Host "Docker Containers Status:" -ForegroundColor Yellow

if ($currentEnv -eq "local") {
    $containers = docker-compose -f docker-compose.local.yml ps --format "table {{.Name}}\t{{.State}}\t{{.Ports}}" 2>$null
} elseif ($currentEnv -eq "development") {
    $containers = docker-compose -f docker-compose.development.yml ps --format "table {{.Name}}\t{{.State}}\t{{.Ports}}" 2>$null
} else {
    $containers = $null
}

if ($containers) {
    Write-Host $containers
} else {
    Write-Host "No containers running" -ForegroundColor Red
}

Write-Host ""

# 서비스 헬스체크
Write-Host "Services Health Check:" -ForegroundColor Yellow

if ($currentEnv -eq "local") {
    $frontendUrl = "http://localhost:3000"
    $backendUrl = "http://localhost:8080/health"
} elseif ($currentEnv -eq "development") {
    $frontendUrl = "http://13.125.231.115:3000"
$backendUrl = "http://13.125.231.115:8080/health"
} else {
    $frontendUrl = $null
    $backendUrl = $null
}

if ($backendUrl) {
    try {
        $response = Invoke-WebRequest -Uri $backendUrl -Method GET -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend: Healthy" -ForegroundColor Green
        } else {
            Write-Host "Backend: Unhealthy (Status: $($response.StatusCode))" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Backend: Not responding" -ForegroundColor Red
    }

    try {
        $response = Invoke-WebRequest -Uri $frontendUrl -Method GET -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            Write-Host "Frontend: Healthy" -ForegroundColor Green
        } else {
            Write-Host "Frontend: Unhealthy (Status: $($response.StatusCode))" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Frontend: Not responding" -ForegroundColor Red
    }
} else {
    Write-Host "No environment set for health check" -ForegroundColor Red
}

Write-Host ""

# 유용한 명령어 제안
Write-Host "Quick Actions:" -ForegroundColor Magenta
if ($currentEnv -eq "local") {
    Write-Host "   Switch to Dev:  .\scripts\start-dev-fast.ps1" -ForegroundColor White
    Write-Host "   View logs:      docker-compose -f docker-compose.local.yml logs -f" -ForegroundColor White
    Write-Host "   Stop:           docker-compose -f docker-compose.local.yml down" -ForegroundColor White
} elseif ($currentEnv -eq "development") {
    Write-Host "   Switch to Local: .\scripts\start-local-fast.ps1" -ForegroundColor White
    Write-Host "   View logs:       docker-compose -f docker-compose.development.yml logs -f" -ForegroundColor White
    Write-Host "   Stop:            docker-compose -f docker-compose.development.yml down" -ForegroundColor White
} else {
    Write-Host "   Start Local:     .\scripts\start-local-fast.ps1" -ForegroundColor White
    Write-Host "   Start Dev:       .\scripts\start-dev-fast.ps1" -ForegroundColor White
}

Write-Host "" 