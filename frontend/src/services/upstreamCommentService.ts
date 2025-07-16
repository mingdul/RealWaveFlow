import api from '../lib/api';

export const createUpstreamComment = async (commentData: {
  comment: string;
  time: string;
  upstream_id: string;
  user_id: string;
}) => {
  const response = await api.post(`/upstream-comment/create`, commentData);
  return response.data;
};

export const getUpstreamComments = async (upstreamId: string) => {
  const response = await api.get(`/upstream-comment/upstream/${upstreamId}`);
  console.log('📦 [getUpstreamComments] Raw response:', response);
  return response.data;
};

export const deleteUpstreamComment = async (upstream_commentId: string) => {
  const response = await api.delete(
    `/upstream-comment/delete/${upstream_commentId}`
  );
  return response.data;
};

export const updateUpstreamComment = async (
  upstream_commentId: string,
  commentData: { comment: string; time: string }
) => {
  const response = await api.put(
    `/upstream-comment/update/${upstream_commentId}`,
    commentData
  );
  return response.data;
};
