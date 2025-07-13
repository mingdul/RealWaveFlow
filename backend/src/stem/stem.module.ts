import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StemService } from './stem.service';
import { StemController } from './stem.controller';
import { Stem } from './stem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stem])],
  controllers: [StemController],
  providers: [StemService],
  exports: [StemService],
})
export class StemModule {}
