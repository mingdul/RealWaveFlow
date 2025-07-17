import { Module } from '@nestjs/common';
import { StemService } from './stem.service';
import { StemController } from './stem.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stem } from './stem.entity';
import { VersionStem } from 'src/version-stem/version-stem.entity';
import { Category } from 'src/category/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stem, VersionStem, Category])],
  controllers: [StemController],
  providers: [StemService],
  exports: [StemService], // 다른 모듈에서 사용할 수 있도록 export
})
export class StemModule {}
