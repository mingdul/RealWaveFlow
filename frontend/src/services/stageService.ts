import apiClient from '../lib/api';
import { CreateStageDto, Stage } from '../types/api';

// 스테이지 생성
export const createStage = async (stageData: CreateStageDto): Promise<Stage> => {
  const response = await apiClient.post('/stage/create', stageData);
  return response.data.stage;
};

// 트랙별 스테이지 목록 조회
export const getTrackStages = async (trackId: string): Promise<Stage[]> => {
  const response = await apiClient.get(`/stage/track/${trackId}`);
  return response.data.stages;
};

// 스테이지 상세 조회
export const getStageDetail = async (stageId: string): Promise<Stage> => {
  const response = await apiClient.get(`/stage/stage/${stageId}`);
  return response.data.stage;
};

// 스테이지 목록이 있는지 확인
export const hasStages = async (trackId: string): Promise<boolean> => {
  try {
    const stages = await getTrackStages(trackId);
    return stages && stages.length > 0;
  } catch (error) {
    console.error('Failed to check stages:', error);
    return false;
  }
};

// 최신 스테이지 조회 (status: 'active'인 스테이지)
export const getLatestStage = async (trackId: string): Promise<Stage | null> => {
    try {
      const stages = await getTrackStages(trackId);
      if (stages && stages.length > 0) {
        // status가 'active'인 스테이지 반환
        return stages.find(stage => stage.status === 'active') || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get latest stage:', error);
      return null;
    }
  }; 