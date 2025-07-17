import api from '../lib/api';
import { StemPeaksPresignedUrlDto, GuidePathStreamingResponse, GuideWaveformPresignedUrlDto, WaveformData } from '../types/api';

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

  async getStemPeaks(stemId: string): Promise<StreamingResponse<{ presignedUrl: string;}>> {
    try {
      const response = await api.get(`/streaming/stem/${stemId}/waveform`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching stem waveform:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch stem waveform',
      };
    }
  }
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

  /**
   * Stem Peaks PresignedUrl 요청
   * @param trackId 트랙 ID
   * @param stemId 스템 ID
   * @returns 파형 데이터 스트리밍 URL
   */
  async getStemPeaksPresignedUrl(trackId: string, stemId: string): Promise<{
    success: boolean;
    data?: GuidePathStreamingResponse;
    message?: string;
  }> {
    try {
      const requestData: StemPeaksPresignedUrlDto = {
        trackId,
        stemId
      };

      const response = await api.post<GuidePathStreamingResponse>('/streaming/stem-peaks-presigned-url', requestData);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Stem peaks presigned URL error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get stem peaks presigned URL',
      };
    }
  }

  /**
   * Guide Waveform PresignedUrl 요청
   * @param upstreamId 업스트림 ID
   * @returns 가이드 파형 데이터 스트리밍 URL
   */
  async getGuideWaveformPresignedUrl(upstreamId: string): Promise<{
    success: boolean;
    data?: GuidePathStreamingResponse;
    message?: string;
  }> {
    try {
      const requestData: GuideWaveformPresignedUrlDto = {
        upstreamId
      };

      const response = await api.post<GuidePathStreamingResponse>('/streaming/guide-waveform-presigned-url', requestData);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Guide waveform presigned URL error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get guide waveform presigned URL',
      };
    }
  }

  /**
   * Presigned URL에서 Waveform JSON 데이터 다운로드
   * @param presignedUrl S3 presigned URL
   * @returns Waveform JSON 데이터
   */
  async downloadWaveformData(presignedUrl: string): Promise<{
    success: boolean;
    data?: WaveformData;
    message?: string;
  }> {
    try {
      const response = await fetch(presignedUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const waveformData: WaveformData = await response.json();
      
      return {
        success: true,
        data: waveformData,
      };
    } catch (error: any) {
      console.error('Download waveform data error:', error);
      return {
        success: false,
        message: error.message || 'Failed to download waveform data',
      };
    }
  }

  /**
   * Stem Waveform 데이터 가져오기 (PresignedUrl 요청 + JSON 다운로드)
   * @param trackId 트랙 ID
   * @param stemId 스템 ID
   * @returns Waveform JSON 데이터
   */
  async getStemWaveformData(trackId: string, stemId: string): Promise<{
    success: boolean;
    data?: WaveformData;
    message?: string;
  }> {
    try {
      // 1. PresignedUrl 요청
      const urlResult = await this.getStemPeaksPresignedUrl(trackId, stemId);
      
      if (!urlResult.success || !urlResult.data?.presignedUrl) {
        return {
          success: false,
          message: urlResult.message || 'Failed to get presigned URL',
        };
      }

      // 2. JSON 데이터 다운로드
      const dataResult = await this.downloadWaveformData(urlResult.data.presignedUrl);
      
      return dataResult;
    } catch (error: any) {
      console.error('Get stem waveform data error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get stem waveform data',
      };
    }
  }

  /**
   * Guide Waveform 데이터 가져오기 (PresignedUrl 요청 + JSON 다운로드)
   * @param upstreamId 업스트림 ID
   * @returns Waveform JSON 데이터
   */
  async getGuideWaveformData(upstreamId: string): Promise<{
    success: boolean;
    data?: WaveformData;
    message?: string;
  }> {
    try {
      // 1. PresignedUrl 요청
      const urlResult = await this.getGuideWaveformPresignedUrl(upstreamId);
      
      if (!urlResult.success || !urlResult.data?.presignedUrl) {
        return {
          success: false,
          message: urlResult.message || 'Failed to get guide waveform presigned URL',
        };
      }

      // 2. JSON 데이터 다운로드
      const dataResult = await this.downloadWaveformData(urlResult.data.presignedUrl);
      
      return dataResult;
    } catch (error: any) {
      console.error('Get guide waveform data error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get guide waveform data',
      };
    }
  }
}


export default new StreamingService();

