import apiClient from '../lib/api';
import { ApiResponse } from '../lib/api';
import { Track } from '../types/api';

class TrackService {
  getTrackById(trackId: string) {
    return apiClient.get<ApiResponse<Track>>(`/track/${trackId}`);
  }

  async createTrack(data: {
    title: string;
    description: string;
    cover_img_path: string;
  }): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<Track>('/track/create', data);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create track',
      };
    }
  }

  async updateTrackStatus(trackId: string, status: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.patch(`/track/${trackId}/status`, { status });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update track status',
      };
    }
  }
}

export default new TrackService();