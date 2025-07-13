import { Module } from '@nestjs/common';
import { VersionStemService } from './version-stem.service';
import { VersionStemController } from './version-stem.controller';

@Module({
  controllers: [VersionStemController],
  providers: [VersionStemService],
})
export class VersionStemModule {}
