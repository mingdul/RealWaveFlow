import apiClient from '../lib/api';
import { CreateStageReviewerDto, StageReviewer } from '../types/api';

// 스테이지 리뷰어 생성
export const createStageReviewer = async (reviewerData: CreateStageReviewerDto) => {
  try {
    const response = await apiClient.post('/stage-reviewer/create', reviewerData);
    return response.data;
  } catch (error) {
    console.error('Failed to create stage reviewer:', error);
    throw error;
  }
};

// 스테이지별 리뷰어 목록 조회
export const getStageReviewers = async (stageId: string) => {
  try {
    const response = await apiClient.get(`/stage-reviewer/${stageId}`);
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    return response.data.stage_reviewers;
  } catch (error) {
    console.error('Failed to get stage reviewers:', error);
    return [];
  }
};

export default {
  createStageReviewer,
  getStageReviewers,
}; 