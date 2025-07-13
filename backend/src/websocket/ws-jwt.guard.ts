import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client = context.switchToWs().getClient();
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        throw new WsException('Token not found');
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      return true;
    } catch (error) {
      throw new WsException('Invalid token');
    }
  }

  private extractTokenFromSocket(client: any): string | null {
    try {
      // 쿠키에서 토큰 추출
      const cookies = client.handshake.headers.cookie;
      if (cookies) {
        const tokenMatch = cookies.match(/token=([^;]+)/);
        if (tokenMatch) {
          return tokenMatch[1];
        }
      }

      // Authorization 헤더에서 토큰 추출 (fallback)
      const authHeader = client.handshake.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }

      return null;
    } catch (error) {
      return null;
    }
  }
} 