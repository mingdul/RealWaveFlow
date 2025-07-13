import { Module } from '@nestjs/common';
import { StageService } from './stage.service';
import { StageController } from './stage.controller';

@Module({
  controllers: [StageController],
  providers: [StageService],
})
export class StageModule {}
