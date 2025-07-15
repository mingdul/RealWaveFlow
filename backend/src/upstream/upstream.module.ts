import { Module } from '@nestjs/common';
import { UpstreamService } from './upstream.service';
import { UpstreamController } from './upstream.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Upstream } from './upstream.entity';
import { VersionStem } from '../version-stem/version-stem.entity';
import { StemJob } from '../stem-job/stem-job.entity';
import { Category } from '../category/category.entity';
import { Stage } from '../stage/stage.entity';
import { StemJobModule } from '../stem-job/stem-job.module';
import { CategoryModule } from '../category/category.module';
import { SqsModule } from '../sqs/sqs.module';
import { UpstreamReviewModule } from 'src/upstream-review/upstream-review.module';
import { StageReviewerModule } from 'src/stage-reviewer/stage-reviewer.module';

@Module({
  imports: [
    // 필요한 모든 엔티티를 한 번에 forFeature에 넘깁니다.
    TypeOrmModule.forFeature([
      Upstream,
      VersionStem,
      StemJob,
      Category,
      Stage,
    ]),

    // 도메인 모듈들
    StemJobModule,
    CategoryModule,
    SqsModule,
    UpstreamReviewModule,
    StageReviewerModule,
  ],
  controllers: [UpstreamController],
  providers: [UpstreamService],
  exports: [UpstreamService],
})
export class UpstreamModule {}
