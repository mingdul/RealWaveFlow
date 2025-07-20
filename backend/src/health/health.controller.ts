import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipTrackAccess } from '../auth/decorators/skip-track-access.decorator';

@ApiTags('health')
@Controller('health')
@SkipTrackAccess()
export class HealthController {
  @Get()
  @ApiOperation({ summary: '헬스 체크', description: '서버의 상태를 확인합니다.' })
  @ApiResponse({ status: 200, description: '서버 정상 동작' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
} 