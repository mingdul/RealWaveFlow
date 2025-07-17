import api from '../lib/api';
import { StemPeaksPresignedUrlDto, GuidePathStreamingResponse, GuideWaveformPresignedUrlDto} from '../types/api';

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
  // waveform 데이터 캐싱을 위한 Map
  private waveformCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

  // 캐시에서 데이터 조회
  private getFromCache(key: string): any | null {
    const cached = this.waveformCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  // 캐시에 데이터 저장
  private setCache(key: string, data: any): void {
    this.waveformCache.set(key, { data, timestamp: Date.now() });
  }

  async getStemWaveformUrl(stemId: string): Promise<StreamingResponse<{
    presignedUrl: string;
    urlExpiresAt: string;
  }>> {
    console.log(`[StreamingService] Requesting stem waveform URL for stemId: ${stemId}`);
    try {
      const response = await api.get(`/streaming/stem/${stemId}/waveform`);
      console.log(`[StreamingService] Successfully fetched stem waveform URL for stemId: ${stemId}`, response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching stem waveform URL for stemId: ${stemId}`, error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch stem waveform',
      };
    }
  }

  /**
   * Version-Stem Waveform URL 요청
   * @param stemId 버전 스템 ID
   * @returns 파형 데이터 스트리밍 URL
   */
  async getVersionStemWaveformUrl(stemId: string): Promise<StreamingResponse<{
    presignedUrl: string;
    urlExpiresAt: string;
  }>> {
    console.log(`[StreamingService] Requesting version-stem waveform URL for stemId: ${stemId}`);
    try {
      const response = await api.get(`/streaming/version-stem/${stemId}/waveform`);
      console.log(`[StreamingService] Successfully fetched version-stem waveform URL for stemId: ${stemId}`, response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching version-stem waveform URL for stemId: ${stemId}`, error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch version-stem waveform',
      };
    }
  }
  // 트랙의 모든 스템 파일 스트리밍 URL 조회
  async getTrackStems(trackId: string, version?: string): Promise<StreamingResponse<TrackStemsResponse>> {
    console.log(`[StreamingService] Requesting track stems for trackId: ${trackId}, version: ${version}`);
    try {
      const params = version ? { version } : {};
      const response = await api.get(`/streaming/track/${trackId}/stems`, { params });
      console.log(`[StreamingService] Successfully fetched track stems for trackId: ${trackId}`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching track stems for trackId: ${trackId}`, error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch track stems',
      };
    }
  }

// guidePath → stageId 기반으로 presigned URL 요청
async getGuidePresignedUrlByStageId(stageId: string): Promise<StreamingResponse<{ presignedUrl: string; urlExpiresAt: string }>> {
  console.log(`[StreamingService] Requesting guide presigned URL by stageId: ${stageId}`);
  try {
    const response = await api.get(`/streaming/stage/${stageId}/guide`);
    console.log(`[StreamingService] Successfully fetched guide presigned URL by stageId: ${stageId}`, response.data);
    
    // 백엔드가 직접 데이터 객체를 반환하므로 success wrapper로 감싸서 반환
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error(`[StreamingService] Error fetching guide streaming URL by stageId: ${stageId}`, error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch guide streaming URL',
    };
  }
}

  async getGuidePresignedUrlbyUpstream(upstreamId: string): Promise<StreamingResponse<{ presignedUrl: string; urlExpiresAt: string }>> {
    console.log(`[StreamingService] Requesting guide presigned URL by upstreamId: ${upstreamId}`);
    try {
      const response = await api.get(`/streaming/upstream/${upstreamId}/guide`);
      console.log(`[StreamingService] Successfully fetched guide presigned URL by upstreamId: ${upstreamId}`, response.data);

      // 백엔드가 직접 데이터 객체를 반환하므로 success wrapper로 감싸서 반환
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching guide streaming URL by upstreamId: ${upstreamId}`, error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch guide streaming URL',
      };
    }
  }


  // 특정 버전의 마스터 스템 파일들 스트리밍 URL 조회
  async getMasterStemStreams(trackId: string, version: number): Promise<StreamingResponse<TrackStemsResponse>> {
    console.log(`[StreamingService] Requesting master stem streams for trackId: ${trackId}, version: ${version}`);
    try {
      const response = await api.get(`/streaming/track/${trackId}/version/${version}/master-stems`);
      console.log(`[StreamingService] Successfully fetched master stem streams for trackId: ${trackId}`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching master stem streams for trackId: ${trackId}`, error);
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
    console.log(`[StreamingService] Requesting stem streaming URL for stemId: ${stemId}`);
    try {
      const response = await api.get(`/streaming/stem/${stemId}`);
      console.log(`[StreamingService] Successfully fetched stem streaming URL for stemId: ${stemId}`, response.data);
      
      // 백엔드가 직접 데이터 객체를 반환하므로 success wrapper로 감싸서 반환
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching stem streaming URL for stemId: ${stemId}`, error);
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
    console.log(`[StreamingService] Requesting version stem streaming URL for stemId: ${stemId}`);
    try {
      const response = await api.get(`/streaming/version-stem/${stemId}`);
      console.log(`[StreamingService] Successfully fetched version stem streaming URL for stemId: ${stemId}`, response.data);
      
      // 백엔드가 직접 데이터 객체를 반환하므로 success wrapper로 감싸서 반환
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching version stem streaming URL for stemId: ${stemId}`, error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch version stem streaming URL',
      };
    }
  }

  // 여러 스템 파일 스트리밍 URL 일괄 조회
  async getBatchStreamingUrls(stemIds: string[]): Promise<StreamingResponse<BatchStreamingResponse>> {
    console.log(`[StreamingService] Requesting batch streaming URLs for stemIds: ${stemIds.join(', ')}`);
    try {
      const response = await api.post('/streaming/batch', { stemIds });
      console.log(`[StreamingService] Successfully fetched batch streaming URLs for stemIds: ${stemIds.join(', ')}`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching batch streaming URLs for stemIds: ${stemIds.join(', ')}`, error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch batch streaming URLs',
      };
    }
  }

  // 업스트림 스템 파일들 스트리밍 URL 조회
  async getUpstreamStems(upstreamId: string): Promise<StreamingResponse<{
    upstreamId: string;
    stems: StemStreamingInfo[];
    totalStems: number;
    urlExpiresAt: string;
  }>> {
    console.log(`[StreamingService] Requesting upstream stems for upstreamId: ${upstreamId}`);
    try {
      const response = await api.get(`/streaming/upstream/${upstreamId}/stems`);
      console.log(`[StreamingService] Successfully fetched upstream stems for upstreamId: ${upstreamId}`, response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching upstream stems for upstreamId: ${upstreamId}`, error);
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
    console.log(`[StreamingService] Requesting stage guide for stageId: ${stageId}`);
    try {
      const response = await api.get(`/streaming/stage/${stageId}/guide`);
      console.log(`[StreamingService] Successfully fetched stage guide for stageId: ${stageId}`, response.data);
      
      // 백엔드가 직접 데이터 객체를 반환하므로 success wrapper로 감싸서 반환
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching stage guide for stageId: ${stageId}`, error);
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
    console.log(`[StreamingService] Requesting upstream guide streaming URL for upstreamId: ${upstreamId}`);
    try {
      const response = await api.get(`/streaming/upstream/${upstreamId}/guide`);
      console.log(`[StreamingService] Successfully fetched upstream guide streaming URL for upstreamId: ${upstreamId}`, response.data);
      
      // 백엔드가 직접 데이터 객체를 반환하므로 success wrapper로 감싸서 반환
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching upstream guide for upstreamId: ${upstreamId}`, error);
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
    console.log(`[StreamingService] Requesting stem peaks presigned URL for trackId: ${trackId}, stemId: ${stemId}`);
    try {
      const requestData: StemPeaksPresignedUrlDto = {
        trackId,
        stemId
      };

      const response = await api.post<GuidePathStreamingResponse>('/streaming/stem-peaks-presigned-url', requestData);
      console.log(`[StreamingService] Successfully fetched stem peaks presigned URL for trackId: ${trackId}, stemId: ${stemId}`, response.data);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching stem peaks presigned URL for trackId: ${trackId}, stemId: ${stemId}`, error);
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
  async getGuideWaveformPresignedUrl(upstreamId: string): Promise<StreamingResponse<{
    presignedUrl: string;
    urlExpiresAt: string;
  }>> {
    console.log(`[StreamingService] Requesting guide waveform presigned URL for upstreamId: ${upstreamId}`);
    try {
      const requestData: GuideWaveformPresignedUrlDto = {
        upstreamId
      };

      const response = await api.post<GuidePathStreamingResponse>('/streaming/guide-waveform-presigned-url', requestData);
      console.log(`[StreamingService] Successfully fetched guide waveform presigned URL for upstreamId: ${upstreamId}`, response.data);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error fetching guide waveform presigned URL for upstreamId: ${upstreamId}`, error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get guide waveform presigned URL',
      };
    }
  }

  /**
   * Presigned URL에서 Waveform JSON 데이터 다운로드
   * @param presignedUrl S3 presigned URL
   * @returns Waveform JSON 데이터 (peaks 배열 또는 WaveformData 객체)
   */
  async downloadWaveformData(presignedUrl: string): Promise<{
    success: boolean;
    data?: any; // peaks 배열 또는 WaveformData 객체
    message?: string;
  }> {
    console.log(`[StreamingService] Downloading waveform data from presigned URL: ${presignedUrl}`);
    try {
      const response = await fetch(presignedUrl);
      
      if (!response.ok) {
        console.error(`[StreamingService] HTTP error downloading waveform data: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData = await response.json();
      console.log('📦 Downloaded waveform JSON:', jsonData);
      
      return {
        success: true,
        data: jsonData,
      };
    } catch (error: any) {
      console.error(`[StreamingService] Error downloading waveform data from ${presignedUrl}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to download waveform data',
      };
    }
  }



  /**
   * Stem Waveform 데이터 가져오기 (PresignedUrl 요청 + JSON 다운로드)
   * @param stemId 스템 ID
   * @returns Waveform JSON 데이터 (peaks 배열 또는 WaveformData 객체)
   */
  async getStemWaveformData(stemId: string): Promise<{
    success: boolean;
    data?: any; // peaks 배열 또는 WaveformData 객체
    message?: string;
  }> {
    console.log(`[StreamingService] Getting stem waveform data for stemId: ${stemId}`);
    try {
      // 캐시에서 먼저 확인
      const cacheKey = `stem-${stemId}`;
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        console.log('📦 Using cached stem waveform data for:', stemId);
        return {
          success: true,
          data: cachedData,
        };
      }

      // 1. PresignedUrl 요청
      const urlResult = await this.getStemWaveformUrl(stemId);
      console.log(`[StreamingService] Stem waveform URL result for ${stemId}:`, urlResult);
      
      if (!urlResult.success || !urlResult.data?.presignedUrl) {
        return {
          success: false,
          message: urlResult.message || 'Failed to get stem waveform presigned URL',
        };
      }

      // 2. JSON 데이터 다운로드
      const dataResult = await this.downloadWaveformData(urlResult.data.presignedUrl);
      console.log(`[StreamingService] Downloaded stem waveform data result for ${stemId}:`, dataResult);
      
      // 성공한 경우 캐시에 저장
      if (dataResult.success && dataResult.data) {
        this.setCache(cacheKey, dataResult.data);
      }
      
      return dataResult;
    } catch (error: any) {
      console.error(`[StreamingService] Error getting stem waveform data for stemId: ${stemId}`, error);
      return {
        success: false,
        message: error.message || 'Failed to get stem waveform data',
      };
    }
  }

  /**
   * Guide Waveform 데이터 가져오기 (PresignedUrl 요청 + JSON 다운로드)
   * @param upstreamId 업스트림 ID
   * @returns Waveform JSON 데이터 (peaks 배열 또는 WaveformData 객체)
   */
  async getGuideWaveformData(upstreamId: string): Promise<{
    success: boolean;
    data?: any; // peaks 배열 또는 WaveformData 객체
    message?: string;
  }> {
    console.log(`[StreamingService] Getting guide waveform data for upstreamId: ${upstreamId}`);
    try {
      // 캐시에서 먼저 확인
      const cacheKey = `guide-${upstreamId}`;
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        console.log('📦 Using cached guide waveform data for:', upstreamId);
        return {
          success: true,
          data: cachedData,
        };
      }

      // 1. PresignedUrl 요청
      const urlResult = await this.getGuideWaveformPresignedUrl(upstreamId);
      console.log(`[StreamingService] Guide waveform URL result for ${upstreamId}:`, urlResult);
      
      if (!urlResult.success || !urlResult.data?.presignedUrl) {
        return {
          success: false,
          message: urlResult.message || 'Failed to get guide waveform presigned URL',
        };
      }

      // 2. JSON 데이터 다운로드
      const dataResult = await this.downloadWaveformData(urlResult.data.presignedUrl);
      console.log(`[StreamingService] Downloaded guide waveform data result for ${upstreamId}:`, dataResult);
      
      // 성공한 경우 캐시에 저장
      if (dataResult.success && dataResult.data) {
        this.setCache(cacheKey, dataResult.data);
      }
      
      return dataResult;
    } catch (error: any) {
      console.error(`[StreamingService] Error getting guide waveform data for upstreamId: ${upstreamId}`, error);
      return {
        success: false,
        message: error.message || 'Failed to get guide waveform data',
      };
    }
  }

  /**
   * Version-Stem Waveform 데이터 가져오기 (PresignedUrl 요청 + JSON 다운로드)
   * @param stemId 버전 스템 ID
   * @returns Waveform JSON 데이터 (peaks 배열 또는 WaveformData 객체)
   */
  async getVersionStemWaveformData(stemId: string): Promise<{
    success: boolean;
    data?: any; // peaks 배열 또는 WaveformData 객체
    message?: string;
  }> {
    console.log(`[StreamingService] Getting version-stem waveform data for stemId: ${stemId}`);
    try {
      // 캐시에서 먼저 확인
      const cacheKey = `version-stem-${stemId}`;
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        console.log('📦 Using cached version-stem waveform data for:', stemId);
        return {
          success: true,
          data: cachedData,
        };
      }

      // 1. PresignedUrl 요청
      const urlResult = await this.getVersionStemWaveformUrl(stemId);
      console.log(`[StreamingService] Version-stem waveform URL result for ${stemId}:`, urlResult);
      
      if (!urlResult.success || !urlResult.data?.presignedUrl) {
        return {
          success: false,
          message: urlResult.message || 'Failed to get version-stem waveform presigned URL',
        };
      }

      // 2. JSON 데이터 다운로드
      const dataResult = await this.downloadWaveformData(urlResult.data.presignedUrl);
      console.log(`[StreamingService] Downloaded version-stem waveform data result for ${stemId}:`, dataResult);
      
      // 성공한 경우 캐시에 저장
      if (dataResult.success && dataResult.data) {
        this.setCache(cacheKey, dataResult.data);
      }
      
      return dataResult;
    } catch (error: any) {
      console.error(`[StreamingService] Error getting version-stem waveform data for stemId: ${stemId}`, error);
      return {
        success: false,
        message: error.message || 'Failed to get version-stem waveform data',
      };
    }
  }
}


export default new StreamingService();

