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
  urlExpiresAt?: string;
}

class StreamingService {
  // 트랙의 모든 스템 파일 스트리밍 URL 조회
  async getTrackStems(trackId: string, version?: string): Promise<StreamingResponse<TrackStemsResponse>> {
    try {
      const params = version ? { version } : {};
      const response = await api.get(`/streaming/track/${trackId}/stems`, { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching track stems:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch track stems',
      };
    }
  }

// guidePath → stageId 기반으로 presigned URL 요청
async getGuidePresignedUrlByStageId(stageId: string): Promise<StreamingResponse<{ presignedUrl: string; urlExpiresAt: string }>> {
  try {
    const response = await api.get(`/streaming/stage/${stageId}/guide`);
    
    // 백엔드가 직접 데이터 객체를 반환하므로 success wrapper로 감싸서 반환
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error('Error fetching guide streaming URL by stageId:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch guide streaming URL',
    };
  }
}

  async getGuidePresignedUrlbyUpstream(upstreamId: string): Promise<StreamingResponse<{ presignedUrl: string; urlExpiresAt: string }>> {
    try {
      const response = await api.get(`/streaming/upstream/${upstreamId}/guide`);

      // 백엔드가 직접 데이터 객체를 반환하므로 success wrapper로 감싸서 반환
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error fetching guide streaming URL by upstreamId:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch guide streaming URL',
      };
    }
  }


  // 특정 버전의 마스터 스템 파일들 스트리밍 URL 조회
  async getMasterStemStreams(trackId: string, version: number): Promise<StreamingResponse<TrackStemsResponse>> {
    try {
      const response = await api.get(`/streaming/track/${trackId}/version/${version}/master-stems`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching master stem streams:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch master stem streams',
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
      const response = await api.get(`/streaming/stem/${stemId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching stem streaming URL:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch stem streaming URL',
      };
    }
  }

  // 버전 스템 파일 스트리밍 URL 조회
  async getVersionStemStreamingUrl(stemId: string): Promise<StreamingResponse<{
    stemId: string;
    fileName: string;
    presignedUrl: string;
    metadata: AudioMetadata;
    urlExpiresAt: string;
  }>> {
    try {
      const response = await api.get(`/streaming/version-stem/${stemId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching version stem streaming URL:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch version stem streaming URL',
      };
    }
  }

  // 여러 스템 파일 스트리밍 URL 일괄 조회
  async getBatchStreamingUrls(stemIds: string[]): Promise<StreamingResponse<BatchStreamingResponse>> {
    try {
      const response = await api.post('/streaming/batch', { stemIds });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching batch streaming URLs:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch batch streaming URLs',
      };
    }
  }

  // 업스트림 스템 파일들 스트리밍 URL 조회
  async getUpstreamStems(upstreamId: string): Promise<{
    upstreamId: string;
    stems: StemStreamingInfo[];
    totalStems: number;
    urlExpiresAt: string;
  } | {
    success: false;
    message: string;
  }> {
    try {
      const response = await api.get(`/streaming/upstream/${upstreamId}/stems`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching upstream stems:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch upstream stems',
      };
    }
  }

  // 스테이지 가이드 파일 스트리밍 URL 조회
  async getStageGuide(stageId: string): Promise<StreamingResponse<{
    guidePath: string;
    presignedUrl: string;
    urlExpiresAt: string;
    fileName: string;
  }>> {
    try {
      const response = await api.get(`/streaming/stage/${stageId}/guide`);
      
      // 백엔드가 직접 데이터 객체를 반환하므로 success wrapper로 감싸서 반환
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error fetching stage guide:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch stage guide',
      };
    }
  }

  // 업스트림 가이드 파일 스트리밍 URL 조회
  async getUpstreamGuideStreamingUrl(upstreamId: string): Promise<StreamingResponse<{
    guidePath: string;
    presignedUrl: string;
    urlExpiresAt: string;
    fileName: string;
  }>> {
    try {
      const response = await api.get(`/streaming/upstream/${upstreamId}/guide`);
      
      // 백엔드가 직접 데이터 객체를 반환하므로 success wrapper로 감싸서 반환
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error fetching upstream guide:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch upstream guide',
      };
    }
  }
}

export default new StreamingService();
