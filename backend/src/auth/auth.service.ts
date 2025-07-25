// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateOAuthLogin(profile: any) {
    try {
      console.log('[validateOAuthLogin] Google profile:', profile);
      
      const email = profile.emails[0].value;
      const username = profile.displayName || email.split('@')[0];
      
      // 기존 사용자 찾기
      let user = await this.usersService.findByEmail(email);
      
      if (!user) {
        console.log('[validateOAuthLogin] 새 사용자 생성:', { email, username });
        // 새 사용자 생성
        await this.usersService.register({
          email,
          username,
          password: await bcrypt.hash(Math.random().toString(36), 10), // 임의의 비밀번호
        });
        user = await this.usersService.findByEmail(email);
      }

      console.log('[validateOAuthLogin] 사용자 정보:', user);
      return user;
    } catch (error) {
      console.error('[validateOAuthLogin] 오류:', error);
      throw new UnauthorizedException('Google 인증 처리 중 오류가 발생했습니다.');
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 올바르지 않습니다.');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      image_url: user.image_url,
    };
  }


  async handleGoogleLogin(user: any) {
    try {
      console.log('[handleGoogleLogin] 사용자 정보:', user);
      
      // JWT 토큰 생성
      const jwt = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        username: user.username,
      });

      return { access_token: jwt, user };
    } catch (error) {
      console.error('[handleGoogleLogin] 오류:', error);
      throw new UnauthorizedException('Google 인증 처리 중 오류가 발생했습니다.');
    }
  }
}
