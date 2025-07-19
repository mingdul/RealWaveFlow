import { Controller, Post, Body, ValidationPipe, Res, UseGuards, Req, Get, Put, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RegisterDto } from './dto/register.dto';
import { Response, Request } from 'express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: '회원가입', description: '새로운 사용자 계정을 생성합니다.' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 200, description: '회원가입 성공' })
  @ApiResponse({ status: 409, description: '이미 존재하는 이메일' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.usersService.register(registerDto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: '비밀번호 찾기', description: '등록된 이메일로 임시 비밀번호를 전송합니다.' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: '임시 비밀번호 전송 성공' })
  @ApiResponse({ status: 404, description: '등록되지 않은 이메일' })
  async forgotPassword(@Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(forgotPasswordDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '현재 사용자 정보', description: 'JWT 토큰을 검증하여 현재 사용자 정보를 반환합니다.' })
  @ApiResponse({ status: 200, description: '사용자 정보 반환 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getMe(@Req() req: Request) {
    const user = req.user as any;
    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          image_url: user.image_url,
        },
      },
    };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '사용자 정보 업데이트', description: '현재 사용자의 정보를 업데이트합니다.' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: '사용자 정보 업데이트 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async updateMe(@Req() req: Request, @Body(ValidationPipe) updateUserDto: UpdateUserDto) {
    const user = req.user as any;
    const updatedUser = await this.usersService.updateUser(user.id, updateUserDto);
    return {
      success: true,
      message: '사용자 정보가 성공적으로 업데이트되었습니다.',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          image_url: updatedUser.image_url,
        },
      },
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '사용자 이름 변경', description: '특정 사용자의 이름을 변경합니다. 본인만 수정 가능합니다.' })
  @ApiParam({ name: 'id', description: '사용자 ID', type: 'string' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: '사용자 이름 변경 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음 (본인만 수정 가능)' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  @ApiResponse({ status: 409, description: '이미 존재하는 사용자명' })
  async updateUserName(
    @Param('id') userId: string,
    @Req() req: Request,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto
  ) {
    const currentUser = req.user as any;
    const updatedUser = await this.usersService.updateUserName(userId, currentUser.id, updateUserDto);
    return {
      success: true,
      message: '사용자 이름이 성공적으로 변경되었습니다.',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          image_url: updatedUser.image_url,
        },
      },
    };
  }

  @Post('logout')
  @ApiOperation({ summary: '로그아웃', description: 'JWT 쿠키를 삭제하여 로그아웃합니다.' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
    return { success: true, message: '로그아웃 완료' };
  }
}
