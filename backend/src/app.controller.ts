import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [], // 추후 다른 모듈들 (예: AuthModule 등)을 여기에 추가
  controllers: [AppController], // 라우팅 처리
  providers: [AppService], // 비즈니스 로직/서비스 제공
})
export class AppModule {}
