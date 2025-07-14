import apiClient from '../lib/api';
import { CreateStageDto, Stage } from '../types/api';

// 스테이지 생성
export const createStage = async (stageData: CreateStageDto) => {
  const response = await apiClient.post('/stage/create', stageData);
  return response.data;
};

// 트랙별 스테이지 목록 조회
export const getTrackStages = async (trackId: string) => {
  try {
    const response = await apiClient.get(`/stage/track/${trackId}`);
    if(!response.data.success){
      throw new Error(response.data.message);
    }
    return response.data.data;
  } catch (error) {
    console.error('Failed to get track stages:', error);
    return [];
  }
};

// 스테이지 상세 조회
export const getStageDetail = async (stageId: string) => {
  const response = await apiClient.get(`/stage/stage/${stageId}`);
  return response.data;
};

// 스테이지 목록이 있는지 확인
export const hasStages = async (trackId: string) => {
  try {
    const stages = await getTrackStages(trackId);
    return stages && stages.length > 0;
  } catch (error) {
    console.error('Failed to check stages:', error);
    return false;
  }
};

// 최신 스테이지 조회 (status: 'active'인 스테이지)
export const getLatestStage = async (trackId: string) => {
    try {
      const stages = await getTrackStages(trackId);
      if (stages && stages.length > 0) {
        // status가 'active'인 스테이지 반환
        return stages.find((stage: Stage) => stage.status === 'active') || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get latest stage:', error);
      return null;
    }
  }; 