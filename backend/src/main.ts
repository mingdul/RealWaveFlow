import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  try {
    console.log('🚀 Starting WaveFlow backend...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Database Host:', process.env.DB_HOST);
    console.log('Database Port:', process.env.DB_PORT);
    console.log('Database Name:', process.env.DB_NAME);
    console.log('Database User:', process.env.DB_USERNAME);
    
    const app = await NestFactory.create(AppModule);

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
        'http://13.125.231.115:3000',
        'http://13.209.14.85',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    const config = new DocumentBuilder()
      .setTitle('WaveFlow API')
      .setDescription('WaveFlow 백엔드 API 문서 - Git 스타일 브랜치 시스템')
      .setVersion('1.0')
      .setContact('WaveFlow Team', 'https://github.com/waveflow', 'contact@waveflow.com')
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
