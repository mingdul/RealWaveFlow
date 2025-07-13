import { Module } from '@nestjs/common';
import { StemService } from './stem.service';
import { StemController } from './stem.controller';

@Module({
  controllers: [StemController],
  providers: [StemService],
})
export class StemModule {}
