import apiClient from '../lib/api';

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