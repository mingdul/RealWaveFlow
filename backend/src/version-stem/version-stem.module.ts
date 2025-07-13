import { Module } from '@nestjs/common';
import { VersionStemService } from './version-stem.service';
import { VersionStemController } from './version-stem.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersionStem } from './version-stem.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([VersionStem])],
  controllers: [VersionStemController],
  providers: [VersionStemService],
})
export class VersionStemModule {}
