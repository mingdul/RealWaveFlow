// services/upstreamService.ts
import api from '../lib/api';

export const getStageUpstreams = async (stageId: string) => {
  return await api.get(`/get-stage-upstreams/${stageId}`);
};