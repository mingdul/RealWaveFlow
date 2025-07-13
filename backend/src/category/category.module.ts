import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports:[
    TypeOrmModule.forFeature([Category]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService, TypeOrmModule],
})
export class CategoryModule {}
