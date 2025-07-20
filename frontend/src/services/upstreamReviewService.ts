import api from '../lib/api';
import apiClient from '../lib/api';

export interface ReviewerWithStatus {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer: {
    id: string;
    username: string;
    email: string;
    image_url: string | null;
    role: string;
  };
  upstream: {
    id: string;
  };
}

export interface UpstreamReviewsResponse {
  success: boolean;
  message: string;
  data: ReviewerWithStatus[];
}

export const approveDropReviewer = async (stageId: string, upstreamId: string) => {
  const res = await api.put(`/upstream-review/approve-drop-reviewer/${stageId}/${upstreamId}/`);
  return res.data;
};

export const rejectDropReviewer = async (stageId: string, upstreamId: string) => {
  const res = await api.put(`/upstream-review/reject-drop-reviewer/${stageId}/${upstreamId}/`);
  return res.data;
};

export interface UpstreamReviewsResponse {
  success: boolean;
  message: string;
  data: ReviewerWithStatus[];
}

// 업스트림 리뷰 조회
export const getUpstreamReviews = async (upstreamId: string) => {
  try {
    const response = await apiClient.get(`/upstream-review/${upstreamId}`);
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  } catch (error) {
    console.error('Failed to get upstream reviews:', error);
    return [];
  }
};

export default {
  getUpstreamReviews,
};

