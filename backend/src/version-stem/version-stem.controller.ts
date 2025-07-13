import { Controller } from '@nestjs/common';
import { VersionStemService } from './version-stem.service';

@Controller('version-stem')
export class VersionStemController {
  constructor(private readonly versionStemService: VersionStemService) {}
}
