import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TrackService } from '../track/track.service';

@Injectable()
export class TrackAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly trackService: TrackService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // JwtAuthGuard로부터 디코딩된 사용자 정보
    const trackId = request.params.trackId || request.body.trackId || request.query.trackId;

    if (!trackId || !user?.id) {
      throw new ForbiddenException('트랙 ID 또는 사용자 정보가 없습니다.');
    }

    const hasAccess = await this.trackService.isUserInTrack(user.id, trackId);

    if (!hasAccess) {
      throw new ForbiddenException('해당 트랙에 접근 권한이 없습니다.');
    }

    return true;
  }
}
