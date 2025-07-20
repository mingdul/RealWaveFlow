import api from '../lib/api';

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

export const getUpstreamReviews = async (upstreamId: string): Promise<ReviewerWithStatus[]> => {
  try {
    const response = await api.get<UpstreamReviewsResponse>(
      `/upstream-review/${upstreamId}`,
      { withCredentials: true }
    );

    if (response.data.success) {
      return response.data.data;
    } else {
      console.warn('Failed to fetch upstream reviews:', response.data.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching upstream reviews:', error);
    return [];
  }
};