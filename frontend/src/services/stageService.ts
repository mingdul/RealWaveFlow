import apiClient from '../lib/api';
import { CreateStageDto, Stage } from '../types/api';

// 스테이지 생성
export const createStage = async (stageData: CreateStageDto) => {
  const response = await apiClient.post('/stage/create', stageData);
  return response.data.data;
};

// 트랙별 스테이지 목록 조회
export const getTrackStages = async (trackId: string) => {
  try {
    const response = await apiClient.get(`/stage/track/${trackId}`);
    console.log('[DEBUG] getTrackStages response:', response.data);
    if(!response.data.success){
      console.log('[DEBUG] getTrackStages failed:', response.data.message);
      throw new Error(response.data.message);
    }
    console.log('[DEBUG] getTrackStages data:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to get track stages:', error);
    return [];
  }
};

// 스테이지 상세 조회
export const getStageDetail = async (stageId: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> => {
  try {
    const response = await apiClient.get(`/stage/stage/${stageId}`);
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    console.error('Failed to get stage detail:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to get stage detail',
    };
  }
};

// 트랙 ID와 버전으로 스테이지 조회
export const getStageByTrackIdAndVersion = async (trackId: string, version: number) => {
  try {
    const response = await apiClient.get(`/stage/track/${trackId}/version/${version}`);
    if(!response.data.success){
      throw new Error(response.data.message);
    }
    return response.data.data;
  } catch (error) {
    console.error('Failed to get stage by track ID and version:', error);
    return null;
  }
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

// 최신 스테이지 조회
export const getLatestStage = async (trackId: string) => {
    try {
      const stages = await getTrackStages(trackId);
      console.log('[DEBUG] getLatestStage stages:', stages);
      if (stages && stages.length > 0) {
        console.log('[DEBUG] Found stages, length:', stages.length);
        // status가 'active'인 스테이지를 우선적으로 찾습니다.
        const activeStage = stages.find((stage: Stage) => stage.status === 'active');
        console.log('[DEBUG] Active stage:', activeStage);
        if (activeStage) {
          return activeStage;
        }
        // active 스테이지가 없으면 가장 최신 스테이지(배열의 첫 번째 항목)를 반환합니다.
        console.log('[DEBUG] No active stage, returning first stage:', stages[0]);
        return stages[0]; 
      }
      console.log('[DEBUG] No stages found or empty array');
      return null;
    } catch (error) {
      console.error('Failed to get latest stage:', error);
      return null;
    }
  }; 

export const getBackToPreviousStage = async (trackId: string, version: number) => {
  try { 
    const response = await apiClient.delete(`/stage/back-to-previous-stage/${trackId}/${version}`);
    if(!response.data.success){
      throw new Error(response.data.message);
    }
    return response.data.message;
  } catch (error: any) {
    console.error('Failed to get back to previous stage:', error);
    return error.response?.data?.message || 'Failed to get back to previous stage';
  }
};
