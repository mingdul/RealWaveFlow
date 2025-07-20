import { SetMetadata } from '@nestjs/common';

export const SKIP_TRACK_ACCESS = 'skipTrackAccess';
export const SkipTrackAccess = () => SetMetadata(SKIP_TRACK_ACCESS, true); 