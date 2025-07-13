import { Controller } from '@nestjs/common';
import { StemService } from './stem.service';

@Controller('stem')
export class StemController {
  constructor(private readonly stemService: StemService) {}
}
