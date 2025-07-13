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
      const { id, displayName, emails, provider } = profile;

      const email = emails?.[0]?.value;

      if (!email) {
        throw new UnauthorizedException('이메일 정보가 없어 로그인할 수 없습니다.');
      }
      let user = await this.usersService.findByProviderId(provider, id);

      if (!user) {
        user = await this.usersService.createFromSocial({
          email,
          username: displayName,
          provider,
          provider_id: id,
        });
      }

      const payload = { sub: user.id, email: user.email, username: user.username };
      const access_token = this.jwtService.sign(payload);

      return {
        access_token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
    } catch (error) {
      console.error('OAuth validation error:', error);
      throw error;
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
    };
  }
}
