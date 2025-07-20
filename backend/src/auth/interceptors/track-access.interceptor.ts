import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { TrackService } from '../../track/track.service';
import { SKIP_TRACK_ACCESS } from '../decorators/skip-track-access.decorator';

@Injectable()
export class TrackAccessInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly trackService: TrackService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // 메타데이터에서 스킵 여부 확인
    const skipTrackAccess = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRACK_ACCESS,
      [context.getHandler(), context.getClass()],
    );

    if (skipTrackAccess) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // JwtAuthGuard로부터 디코딩된 사용자 정보

    // 사용자가 인증되지 않은 경우 패스 (JwtAuthGuard에서 처리됨)
    if (!user?.id) {
      return next.handle();
    }

    // trackId 추출 (params, body, query 순서로 확인)
    const trackId = 
      request.params.trackId || 
      request.body.trackId || 
      request.query.trackId;

    // trackId가 없는 경우 패스 (트랙과 관련없는 API)
    if (!trackId) {
      return next.handle();
    }

    // 트랙 접근 권한 확인
    const hasAccess = await this.trackService.isUserInTrack(user.id, trackId);

    if (!hasAccess) {
      throw new ForbiddenException('해당 트랙에 접근 권한이 없습니다.');
    }

    return next.handle();
  }
} 