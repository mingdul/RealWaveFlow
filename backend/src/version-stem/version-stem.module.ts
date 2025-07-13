import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersionStemService } from './version-stem.service';
import { VersionStemController } from './version-stem.controller';
import { VersionStem } from './version-stem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VersionStem])],
  controllers: [VersionStemController],
  providers: [VersionStemService],
  exports: [VersionStemService],
})
export class VersionStemModule {}
