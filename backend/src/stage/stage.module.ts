import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StageService } from './stage.service';
import { StageController } from './stage.controller';
import { Stage } from './stage.entity';
import { SqsModule } from '../sqs/sqs.module';
import { VersionStemModule } from '../version-stem/version-stem.module';
import { StageReviewerModule } from 'src/stage-reviewer/stage-reviewer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stage]),
    SqsModule,
    VersionStemModule,
    StageReviewerModule,
  ],
  controllers: [StageController],
  providers: [StageService],
  exports: [StageService],
})
export class StageModule {}
