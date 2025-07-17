import { webcrypto } from 'crypto';
;(global as any).crypto = webcrypto;
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as express from 'express'; // 🔹 반드시 *로 import 해야 static 사용 가능
import { join } from 'path'; // 🔹 path.join 대신 join을 쓰면 깔끔함

async function bootstrap() {
  try {
    console.log('🚀 Starting WaveFlow backend...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Database Host:', process.env.DB_HOST);
    console.log('Database Port:', process.env.DB_PORT);
    console.log('Database Name:', process.env.DB_NAME);
    console.log('Database User:', process.env.DB_USERNAME);
    
    const app = await NestFactory.create(AppModule);

    // ✅ Express 인스턴스를 얻어서 정적 파일 서빙 미들웨어 등록
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use('/backend-assets', express.static(join(__dirname, '..', 'public', 'assets')));
    
    app.use(cookieParser());
    // src/main.ts
    app.use((req, res, next) => {
      console.log('[HTTP REQUEST]', req.method, req.originalUrl);
      console.log('[DEBUG] req.cookies =', req.cookies);
      next();
    });
    
    app.useGlobalPipes(new ValidationPipe());
    
    app.enableCors({
      origin: [
        'http://localhost:5173', 
        'http://localhost:3000', 
        'http://127.0.0.1:3000',
        'https://waveflow.pro', // 프로덕션 URL 추가
        'https://www.waveflow.pro'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    const config = new DocumentBuilder()
      .setTitle('WaveFlow API')
      .setDescription('WaveFlow 백엔드 API 문서 - Git 스타일 브랜치 시스템')
      .setVersion('1.0')
      .setContact('Team HoneyBadgers', 'https://github.com/waveflow', 'lwk9589@gmail.com')
      .addBearerAuth()
      .addTag('auth', '인증 관련 API')
      .addTag('users', '사용자 관리 API')
      .addTag('collaborators', '협업자 관리 API')
      .addTag('uploads', '파일 업로드 API')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📚 Swagger docs available at http://localhost:${port}/api-docs`);
    console.log('✅ WaveFlow backend started successfully!');
  } catch (error) {
    console.error('❌ Failed to start WaveFlow backend:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
