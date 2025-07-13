import { Module } from '@nestjs/common';
import { StageReviewerService } from './stage-reviewer.service';
import { StageReviewerController } from './stage-reviewer.controller';

@Module({
  controllers: [StageReviewerController],
  providers: [StageReviewerService],
})
export class StageReviewerModule {}
