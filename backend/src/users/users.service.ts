import { Injectable, ConflictException, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './user.entity';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
    image_url?: string;
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

  // 사용자 정보 업데이트
  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 업데이트할 필드들만 추출
    const updateData: Partial<User> = {};
    if (updateUserDto.username !== undefined) {
      updateData.username = updateUserDto.username;
    }
    if (updateUserDto.image_url !== undefined) {
      updateData.image_url = updateUserDto.image_url;
    }

    // 업데이트할 데이터가 있는 경우에만 업데이트 실행
    if (Object.keys(updateData).length > 0) {
      await this.userRepository.update(userId, updateData);
    }
    
    // 업데이트된 사용자 정보 반환
    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new NotFoundException('업데이트된 사용자 정보를 찾을 수 없습니다.');
    }
    return updatedUser;
  }

  // 사용자 이름 변경 (권한 검증 및 중복 검증 포함)
  async updateUserName(userId: string, currentUserId: string, updateUserDto: UpdateUserDto): Promise<User> {
    // 권한 검증: 본인만 수정 가능
    if (userId !== currentUserId) {
      throw new ForbiddenException('본인의 정보만 수정할 수 있습니다.');
    }

    // 사용자 존재 여부 확인
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // username이 제공된 경우에만 중복 검증 수행
    if (updateUserDto.username !== undefined) {
      // 현재 사용자명과 동일한 경우는 허용
      if (updateUserDto.username !== user.username) {
        // 다른 사용자가 이미 사용하고 있는 사용자명인지 확인
        const existingUser = await this.userRepository.findOne({ 
          where: { username: updateUserDto.username } 
        });
        if (existingUser) {
          throw new ConflictException('이미 존재하는 사용자명입니다.');
        }
      }
    }

    // 업데이트할 필드들만 추출
    const updateData: Partial<User> = {};
    if (updateUserDto.username !== undefined) {
      updateData.username = updateUserDto.username;
    }
    if (updateUserDto.image_url !== undefined) {
      updateData.image_url = updateUserDto.image_url;
    }

    // 업데이트할 데이터가 있는 경우에만 업데이트 실행
    if (Object.keys(updateData).length > 0) {
      await this.userRepository.update(userId, updateData);
    }
    
    // 업데이트된 사용자 정보 반환
    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new NotFoundException('업데이트된 사용자 정보를 찾을 수 없습니다.');
    }
    return updatedUser;
  }
}
