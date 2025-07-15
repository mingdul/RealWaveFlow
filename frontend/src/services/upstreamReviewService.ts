import api from '../lib/api';

export const approveDropReviewer = async (stageId: string, upstreamId: string) => {
  const res = await api.put(`/upstream-review/approve-drop-reviewer/${stageId}/${upstreamId}`);
  return res.data;
};

export const rejectDropReviewer = async (stageId: string, upstreamId: string) => {
  const res = await api.put(`/upstream-review/reject-drop-reviewer/${stageId}/${upstreamId}`);
  return res.data;
};