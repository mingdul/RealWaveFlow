import { Module } from '@nestjs/common';
import { StageReviewerService } from './stage-reviewer.service';
import { StageReviewerController } from './stage-reviewer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StageReviewer } from './stage-reviewer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StageReviewer])],
  controllers: [StageReviewerController],
  providers: [StageReviewerService],
  exports: [StageReviewerService],
})
export class StageReviewerModule {}
