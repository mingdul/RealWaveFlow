// services/upstreamService.ts
import apiClient from '../lib/api';
import { CreateUpstreamDto } from '../types/api';

// 업스트림 생성
export const createUpstream = async (upstreamData: CreateUpstreamDto) => {
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
export const getUpstreamStems = async (upstreamId: string, trackId: string) => {
  return await apiClient.get(`/stem/upstream/${upstreamId}/track/${trackId}`);
}; 

export default {
  createUpstream,
  getStageUpstreams,
  getUpstreamDetail,
  getUpstreamStems
};