import apiClient, { ApiResponse } from '../lib/api';

// Types for stem-job API
export interface InitStartRequest {
  title: string;
  description: string;
  genre: string;
  bpm: string;
  key_signature: string;
  image_url: string;
  stage_title: string;
  stage_description: string;
}

export interface InitStartResponse {
  track: {
    title: string;
    image_url: string;
    description: string;
    genre: string;
    bpm: string;
    key_signature: string;
    owner_id: {
      id: string;
    };
    id: string;
    status: string;
    created_date: string;
    updated_date: string;
  };
  stage: {
    title: string;
    description: string;
    version: number;
    status: string;
    guide_path: string | null;
    created_at: string;
    track: {
      id: string;
    };
    user: {
      id: string;
    };
    id: string;
  };
}

export interface StemJobCreateRequest {
  file_name: string;
  file_path: string;
  key: string;
  bpm: string;
  instrument: string;
  stage_id: string;
  track_id: string;
}

export interface RequestMixingInitRequest {
  stageId: string;
}

class StemJobService {
  /**
   * Initialize track and stage
   */
  async initStart(data: InitStartRequest): Promise<ApiResponse<InitStartResponse>> {
    console.log('[DEBUG] StemJobService - Calling init-start with data:', data);
    
    try {
      const response = await apiClient.post<ApiResponse<InitStartResponse>>('/stem-job/init-start', data);
      console.log('[DEBUG] StemJobService - init-start response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[ERROR] StemJobService - init-start failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to initialize track and stage');
    }
  }

  /**
   * Create stem job
   */
  async createStemJob(data: StemJobCreateRequest): Promise<ApiResponse<any>> {
    console.log('[DEBUG] StemJobService - Calling create stem job with data:', data);
    
    try {
      const response = await apiClient.post<ApiResponse<any>>('/stem-job/create', data);
      console.log('[DEBUG] StemJobService - create stem job response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[ERROR] StemJobService - create stem job failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to create stem job');
    }
  }

  /**
   * dup check
   */
  async dupCheck(data: StemJobCreateRequest): Promise<ApiResponse<any>> {
    console.log('[DEBUG] StemJobService - Calling dup check with data:', data);
    
    try {
      const response = await apiClient.post<ApiResponse<any>>('/stem-job/dup-check', data);
      console.log('[DEBUG] StemJobService - dup check response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[ERROR] StemJobService - dup check failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to dup check');
    }
  }



  /**
   * Request mixing initialization
   */
  async requestMixingInit(data: RequestMixingInitRequest): Promise<ApiResponse<any>> {
    console.log('[DEBUG] StemJobService - Calling request-mixing-init with data:', data);
    
    try {
      const response = await apiClient.post<ApiResponse<any>>('/stem-job/request-mixing-init', data);
      console.log('[DEBUG] StemJobService - request-mixing-init response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[ERROR] StemJobService - request-mixing-init failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to request mixing initialization');
    }
  }
}

export default new StemJobService(); 