import api from '../lib/api';

export interface AudioMetadata {
  duration?: number;
  fileSize?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
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

export interface TrackStemsResponse {
  trackId: string;
  trackInfo: any;
  stems: StemStreamingInfo[];
  totalStems: number;
  urlExpiresAt: string;
}

export interface SessionStemsResponse {
  sessionId: string;
  stems: StemStreamingInfo[];
  totalStems: number;
  urlExpiresAt: string;
}

export interface BatchStreamingResponse {
  streams: Array<{
    stemId: string;
    fileName: string;
    presignedUrl: string;
    metadata: AudioMetadata;
  }>;
  urlExpiresAt: string;
}

export interface StreamingResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

class StreamingService {
  // 트랙의 모든 스템 파일 스트리밍 URL 조회
  async getTrackStems(trackId: string, version?: string): Promise<StreamingResponse<TrackStemsResponse>> {
    try {
      const params = version ? { version } : {};
      const response = await api.get(`/api/tracks/${trackId}/stems`, { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching track stems:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch track stems',
      };
    }
  }

  // 세션의 스템 파일들 스트리밍 URL 조회
  async getSessionStems(sessionId: string): Promise<StreamingResponse<SessionStemsResponse>> {
    try {
      const response = await api.get(`/api/sessions/${sessionId}/stems`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching session stems:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch session stems',
      };
    }
  }

  // 여러 스템 파일 스트리밍 URL 일괄 조회
  async getBatchStreamingUrls(stemIds: string[]): Promise<StreamingResponse<BatchStreamingResponse>> {
    try {
      const response = await api.post('/api/audio/stream/batch', { stemIds });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching batch streaming URLs:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch batch streaming URLs',
      };
    }
  }

  // 개별 스템 파일 스트리밍 URL 조회
  async getStemStreamingUrl(stemId: string): Promise<StreamingResponse<{
    stemId: string;
    fileName: string;
    presignedUrl: string;
    metadata: AudioMetadata;
    urlExpiresAt: string;
  }>> {
    try {
      const response = await api.get(`/api/audio/stream/${stemId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching stem streaming URL:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch stem streaming URL',
      };
    }
  }

  // 특정 take의 마스터 스템 파일들 스트리밍 URL 조회
  async getMasterStemStreams(trackId: string, take: number): Promise<StreamingResponse<TrackStemsResponse & { take: number }>> {
    try {
      const response = await api.get(`/api/tracks/${trackId}/master-stems/${take}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching master stem streams:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch master stem streams',
      };
    }
  }
}

export default new StreamingService();
