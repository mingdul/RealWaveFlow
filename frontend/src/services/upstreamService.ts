// services/upstreamService.ts
import apiClient from '../lib/api';
import { CreateUpstreamDto } from '../types/api';

// 업스트림 생성
export const createUpstream = async (upstreamData: CreateUpstreamDto | any) => {
  try {
    const response = await apiClient.post('/upstream/create', upstreamData);
    return response.data;
  } catch (error) {
    console.error('Failed to create upstream:', error);
    throw error;
  }
};

// 스테이지별 업스트림 목록 조회
export const getStageUpstreams = async (stageId: string) => {
  try {
    const response = await apiClient.get(`/upstream/get-stage-upstreams/${stageId}`);
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    return response.data.upstreams || [];
  } catch (error) {
    console.error('Failed to get stage upstreams:', error);
    return [];
  }
};

// 업스트림 상세 조회
export const getUpstreamDetail = async (upstreamId: string) => {
  try {
    const response = await apiClient.get(`/upstream/${upstreamId}`);
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    return response.data.upstream;
  } catch (error) {
    console.error('Failed to get upstream detail:', error);
    throw error;
  }
};

// 새로운 함수: 백엔드의 stem API 호출
export const getUpstreamStems = async (trackId: string, upstreamId: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> => {
  try {
    const response = await apiClient.get(`/stem/upstream/${trackId}/track/${upstreamId}`);
    console.log('📦 [getUpstreamStems] Raw response:', response);
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error('Error fetching upstream stems:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch upstream stems',
    };
  }
}; 

export const getUpstreamByUpstreamId = async (upstreamId: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> => {
  try {
    const response = await apiClient.get(`/upstream/get-upstreams-stems/${upstreamId}`);
    console.log('📦 [getUpstreamByUpstreamId] Raw response:', response);
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error('Error fetching upstream by ID:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch upstream by ID',
    };
  }
};

export default {
  createUpstream,
  getStageUpstreams,
  getUpstreamDetail,
  getUpstreamStems
};