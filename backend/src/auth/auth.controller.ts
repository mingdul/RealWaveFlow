import { Controller, Get, Post, Body, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SkipTrackAccess } from './decorators/skip-track-access.decorator';

@ApiTags('auth')
@Controller('auth')
@SkipTrackAccess()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: '일반 로그인', description: '이메일과 비밀번호로 로그인합니다.' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '로그인 실패' })
  async login(
    @Body() loginDto: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.validateUser(loginDto.email, loginDto.password);
      
      const payload = { sub: result.id, email: result.email, username: result.username };
      const token = this.jwtService.sign(payload);

      console.log('[DEBUG] Setting JWT cookie:', token.substring(0, 20) + '...');
      
      res.cookie('jwt', token, {
        httpOnly: true, // 보안을 위해 항상 httpOnly 사용
        secure: process.env.NODE_ENV === 'production', // 프로덕션에서는 HTTPS 필요
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24, // 24시간
        path: '/',
      });

      console.log('[DEBUG] Cookie set successfully');
      
      return { 
        success: true,
        message: '로그인 성공', 
        data: { user: { id: result.id, email: result.email, username: result.username } } 
      };
    } catch (error) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  }

  @Get('google')
  @ApiOperation({ summary: '구글 로그인', description: '구글 OAuth 로그인 페이지로 리디렉션합니다.' })
  @ApiResponse({ status: 302, description: '구글 로그인 페이지로 리디렉션' })
  @UseGuards(AuthGuard('google'))
  @SkipTrackAccess()
  async googleAuth() {
    // passport-google-oauth20가 자동으로 Google 로그인 페이지로 리디렉션
  }

  @Post('google/callback')
  @ApiOperation({ summary: '구글 로그인 콜백', description: '구글 로그인 완료 후 호출되는 콜백 엔드포인트입니다.' })
  @ApiResponse({ status: 200, description: '구글 로그인 성공' })
  @UseGuards(AuthGuard('google'))
  @SkipTrackAccess()
  async googleCallback(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    try {
      console.log('[DEBUG] Google callback received');
      
      // Google 인증 처리 및 JWT 토큰 생성
      const { access_token, user } = await this.authService.handleGoogleLogin(req.user);

      // 프로덕션/개발 환경에 따른 설정
      const isProd = process.env.NODE_ENV === 'production';
      const domain = isProd ? 'waveflow.pro' : 'localhost';

      // 쿠키 설정
      res.cookie('jwt', access_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        domain: domain,
        maxAge: 24 * 60 * 60 * 1000, // 24시간
        path: '/',
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
          },
        },
      };
    } catch (error) {
      console.error('[ERROR] Google callback error:', error);
      throw new UnauthorizedException('Google 로그인 처리 중 오류가 발생했습니다.');
    }
  }

  @Get('me')
  @ApiOperation({ summary: '현재 사용자 정보', description: '쿠키의 JWT를 검증하여 현재 사용자 정보를 반환합니다.' })
  @ApiResponse({ status: 200, description: '사용자 정보 반환 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getCurrentUser(@Req() req: Request) {
    try {
      const token = req.cookies?.jwt;
      if (!token) {
        throw new UnauthorizedException('JWT 토큰이 없습니다.');
      }

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
          },
        },
      };
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  @Get('logout')
  @ApiOperation({ summary: '로그아웃', description: 'JWT 쿠키를 삭제하여 로그아웃합니다.' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
    return { message: '로그아웃 성공' };
  }
}
