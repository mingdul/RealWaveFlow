import { Controller } from '@nestjs/common';
import { StageReviewerService } from './stage-reviewer.service';

@Controller('stage-reviewer')
export class StageReviewerController {
  constructor(private readonly stageReviewerService: StageReviewerService) {}
}
