import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './user.entity';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { emailTransporter } from '../config/email.config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, username ,password } = registerDto;
    
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      username,
      password: hashedPassword,
    });

    await this.userRepository.save(user);
    return { success: true, message: '회원가입이 완료되었습니다.' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('해당 이메일로 등록된 사용자가 없습니다.');
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);
    
    await this.userRepository.update(user.id, { password: hashedTempPassword });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '임시 비밀번호 발급',
      text: `임시 비밀번호: ${tempPassword}\n로그인 후 비밀번호를 변경해주세요.`,
    };

    await emailTransporter.sendMail(mailOptions);
    return { message: '임시 비밀번호가 이메일로 전송되었습니다.' };
  }

  // src/users/users.service.ts
  async findByProviderId(provider: string, provider_id: string) {
    return await this.userRepository.findOne({ where: { provider, provider_id } });
  }

  async createFromSocial(data: {
    email: string;
    username: string;
    provider: string;
    provider_id: string;
  }) {
    const user = this.userRepository.create(data);
    return await this.userRepository.save(user);
  }

  // 이메일로 사용자 찾기
  async findByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { email } });
  }

  // ID로 사용자 찾기
  async findById(id: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { id } });
  }
}
