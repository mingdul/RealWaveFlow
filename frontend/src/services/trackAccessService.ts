import apiClient from '../lib/api';

export interface TrackAccessResponse {
  success: boolean;
  hasAccess: boolean;
  trackId: string;
}

export interface TrackInfoResponse {
  success: boolean;
  data: {
    stageId?: string;
    upstreamId?: string;
    trackId: string;
    trackTitle: string;
  };
}

class TrackAccessService {
  // 트랙 멤버 여부 직접 확인
  async checkTrackAccess(trackId: string): Promise<TrackAccessResponse> {
    try {
      const response = await apiClient.get(`/tracks/${trackId}/check-access`);
      return response.data;
    } catch (error) {
      console.error('[TrackAccessService] Failed to check track access:', error);
      return {
        success: false,
        hasAccess: false,
        trackId
      };
    }
  }

  // Stage ID에서 Track 정보 추출
  async getTrackInfoFromStage(stageId: string): Promise<TrackInfoResponse | null> {
    try {
      const response = await apiClient.get(`/stage/${stageId}/track-info`);
      return response.data;
    } catch (error) {
      console.error('[TrackAccessService] Failed to get track info from stage:', error);
      return null;
    }
  }

  // Upstream ID에서 Track 정보 추출
  async getTrackInfoFromUpstream(upstreamId: string): Promise<TrackInfoResponse | null> {
    try {
      const response = await apiClient.get(`/upstream/${upstreamId}/track-info`);
      return response.data;
    } catch (error) {
      console.error('[TrackAccessService] Failed to get track info from upstream:', error);
      return null;
    }
  }

  // Stage ID로 트랙 접근 권한 확인
  async checkStageAccess(stageId: string): Promise<{ hasAccess: boolean; trackId?: string }> {
    try {
      const trackInfo = await this.getTrackInfoFromStage(stageId);
      if (!trackInfo?.success || !trackInfo.data.trackId) {
        return { hasAccess: false };
      }

      const accessCheck = await this.checkTrackAccess(trackInfo.data.trackId);
      return {
        hasAccess: accessCheck.hasAccess,
        trackId: trackInfo.data.trackId
      };
    } catch (error) {
      console.error('[TrackAccessService] Failed to check stage access:', error);
      return { hasAccess: false };
    }
  }

  // Upstream ID로 트랙 접근 권한 확인
  async checkUpstreamAccess(upstreamId: string): Promise<{ hasAccess: boolean; trackId?: string }> {
    try {
      const trackInfo = await this.getTrackInfoFromUpstream(upstreamId);
      if (!trackInfo?.success || !trackInfo.data.trackId) {
        return { hasAccess: false };
      }

      const accessCheck = await this.checkTrackAccess(trackInfo.data.trackId);
      return {
        hasAccess: accessCheck.hasAccess,
        trackId: trackInfo.data.trackId
      };
    } catch (error) {
      console.error('[TrackAccessService] Failed to check upstream access:', error);
      return { hasAccess: false };
    }
  }
}

export default new TrackAccessService(); 