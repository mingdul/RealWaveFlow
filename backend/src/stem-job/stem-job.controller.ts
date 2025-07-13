import { Controller } from '@nestjs/common';
import { StemJobService } from './stem-job.service';

@Controller('stem-job')
export class StemJobController {
  constructor(private readonly stemJobService: StemJobService) {}
}
