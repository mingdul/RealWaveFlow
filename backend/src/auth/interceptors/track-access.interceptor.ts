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
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    console.log(`[TrackAccessInterceptor] ${method} ${url}`);

    // 메타데이터에서 스킵 여부 확인
    const skipTrackAccess = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRACK_ACCESS,
      [context.getHandler(), context.getClass()],
    );

    if (skipTrackAccess) {
      console.log(`[TrackAccessInterceptor] SKIP: ${method} ${url}`);
      return next.handle();
    }

    const user = request.user; // JwtAuthGuard로부터 디코딩된 사용자 정보

    // 사용자가 인증되지 않은 경우 패스 (JwtAuthGuard에서 처리됨)
    if (!user?.id) {
      console.log(`[TrackAccessInterceptor] NO USER: ${method} ${url}`);
      return next.handle();
    }

    // trackId 추출 (params, body, query 순서로 확인)
    let trackId = 
      request.params.trackId || 
      request.body.trackId || 
      request.query.trackId;

    // 특정 경로들에서만 trackId 체크 수행
    const needsTrackIdCheck = [
      '/streaming/', 
      '/download/', 
      '/stem-job/',
      '/upload/'
    ].some(path => url.includes(path));

    // /tracks/:id 경로는 이미 SkipTrackAccess가 적용되어 있으므로 체크하지 않음
    
    console.log(`[TrackAccessInterceptor] userId: ${user.id}, trackId: ${trackId}, needsCheck: ${needsTrackIdCheck}, params:`, request.params);

    // trackId 체크가 필요하지 않은 경우 패스
    if (!needsTrackIdCheck) {
      console.log(`[TrackAccessInterceptor] NO CHECK NEEDED: ${method} ${url}`);
      return next.handle();
    }

    // trackId가 없는 경우 패스 (트랙과 관련없는 API)
    if (!trackId) {
      console.log(`[TrackAccessInterceptor] NO TRACK ID: ${method} ${url}`);
      return next.handle();
    }

    console.log(`[TrackAccessInterceptor] Checking access for user ${user.id} to track ${trackId}`);

    // 트랙 접근 권한 확인
    const hasAccess = await this.trackService.isUserInTrack(user.id, trackId);

    console.log(`[TrackAccessInterceptor] Access result: ${hasAccess} for user ${user.id} to track ${trackId}`);

    if (!hasAccess) {
      console.log(`[TrackAccessInterceptor] ACCESS DENIED: user ${user.id} to track ${trackId}`);
      throw new ForbiddenException('해당 트랙에 접근 권한이 없습니다.');
    }

    return next.handle();
  }
} 