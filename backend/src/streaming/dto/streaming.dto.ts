import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class BatchStreamRequestDto {
  @IsArray()
  @IsUUID('4', { each: true })
  stemIds: string[];
}

export class TrackStemsQueryDto {
  @IsOptional()
  @IsString()
  version?: string;
}

export interface StemStreamingInfo {
  id: string;
  fileName: string;
  category?: string;
  tag?: string;
  key?: string;
  description?: string;
  presignedUrl: string;
  metadata: AudioMetadata;
  uploadedBy: {
    id: string;
    username: string;
  };
  uploadedAt: string;
}

export interface AudioMetadata {
  duration?: number;
  fileSize?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
}

export interface StreamingResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  urlExpiresAt?: string;
}
