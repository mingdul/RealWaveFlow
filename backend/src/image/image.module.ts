import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageService } from './image.service';
import { ImageController } from './image.controller';
import { Track } from '../track/track.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Track])],
  controllers: [ImageController],
  providers: [ImageService],
  
})
export class ImageModule {}
