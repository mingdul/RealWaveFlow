import apiClient, { ApiResponse } from '../lib/api';
import { Track, CreateTrackDto, TrackCollaborator } from '../types/api';

// 백엔드 응답 구조에 맞는 타입 정의
interface TracksResponse {
  tracks: Track[];
}

interface CollaboratorTracksResponse {
  tracks: Track[];
}

class TrackService {
  /**
   * 새 트랙 생성
   */
  async createTrack(trackData: CreateTrackDto): Promise<ApiResponse<Track>> {
    try {
      console.log('[DEBUG] Creating track with data:', trackData);
      const response = await apiClient.post<ApiResponse<Track>>(
        '/tracks',
        trackData
      );
      console.log('[DEBUG] Create track response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DEBUG] Create track error:', error);
      throw new Error(error.response?.data?.message || '트랙 생성에 실패했습니다.');
    }
  }

  /**
   * 특정 트랙 조회
   */
  async getTrackById(trackId: string): Promise<ApiResponse<Track>> {
    try {
      const response = await apiClient.get<ApiResponse<Track>>(
        `/tracks/${trackId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '트랙 조회에 실패했습니다.');
    }
  }

  /**
   * 사용자의 모든 트랙 조회 (대시보드용)
   */
  async getUserTracks(): Promise<ApiResponse<TracksResponse>> {
    try {
      const response = await apiClient.get<ApiResponse<TracksResponse>>(
        '/tracks'
      );
      console.log('[DEBUG] getUserTracks response:', response.data);
      // 백엔드에서 직접 { success: true, data: { tracks } } 형태로 반환하므로 그대로 반환
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '트랙 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 협업 트랙 조회
   */
  async getCollaboratorTracks(): Promise<ApiResponse<CollaboratorTracksResponse>> {
    try {
      const response = await apiClient.get<ApiResponse<CollaboratorTracksResponse>>(
        '/tracks/collaborator'
      );
      // 백엔드에서 직접 { success: true, data: { tracks } } 형태로 반환하므로 그대로 반환
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '협업 트랙 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 트랙 업데이트
   */
  async updateTrack(trackId: string, trackData: Partial<CreateTrackDto>): Promise<ApiResponse<Track>> {
    try {
      const response = await apiClient.put<ApiResponse<Track>>(
        `/tracks/${trackId}`,
        trackData
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '트랙 업데이트에 실패했습니다.');
    }
  }

  /**
   * 트랙 삭제
   */
  async deleteTrack(trackId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.delete<ApiResponse>(
        `/tracks/${trackId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '트랙 삭제에 실패했습니다.');
    }
  }

  /**
   * 트랙 협업자 추가
   */
  async addCollaborator(trackId: string, collaboratorData: {
    email: string;
    role: 'collaborator' | 'viewer';
    permissions: string;
  }): Promise<ApiResponse<TrackCollaborator>> {
    try {
      const response = await apiClient.post<ApiResponse<TrackCollaborator>>(
        `/tracks/${trackId}/collaborators`,
        collaboratorData
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '협업자 추가에 실패했습니다.');
    }
  }

  /**
   * 트랙 협업자 목록 조회
   */
  async getCollaborators(trackId: string): Promise<ApiResponse<TrackCollaborator[]>> {
    try {
      console.log('[DEBUG] TrackService - getCollaborators for trackId:', trackId);
      
      const response = await apiClient.get(
        `/track-collaborator/track/${trackId}`
      );
      
      console.log('[DEBUG] TrackService - getCollaborators raw response:', response.data);
      
      // 백엔드가 { collaborators: [...] } 형태로 응답하므로 ApiResponse 형태로 변환
      if (response.data && response.data.collaborators) {
        const transformedResponse: ApiResponse<TrackCollaborator[]> = {
          success: true,
          data: response.data.collaborators,
          message: 'Collaborators retrieved successfully'
        };
        console.log('[DEBUG] TrackService - transformed response:', transformedResponse);
        return transformedResponse;
      } else {
        // 백엔드 응답이 이미 ApiResponse 형태인 경우
        return response.data;
      }
    } catch (error: any) {
      console.error('[ERROR] TrackService - getCollaborators failed:', error);
      throw new Error(error.response?.data?.message || '협업자 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 트랙 협업자 제거
   */
  async removeCollaborator(trackId: string, collaboratorId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.delete<ApiResponse>(
        `/tracks/${trackId}/collaborators/${collaboratorId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '협업자 제거에 실패했습니다.');
    }
  }


  async updateTrackStatus(trackId: string, status: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.put<ApiResponse>(
        `/tracks/status/${trackId}/${status}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '트랙 상태 업데이트에 실패했습니다.');
    }
  }
}


export default new TrackService(); 