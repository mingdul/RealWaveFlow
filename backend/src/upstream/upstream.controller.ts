import { Controller } from '@nestjs/common';
import { UpstreamService } from './upstream.service';

@Controller('upstream')
export class UpstreamController {
  constructor(private readonly upstreamService: UpstreamService) {}
}
