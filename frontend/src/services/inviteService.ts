import apiClient from "../lib/api";

class InviteService {
  async createInviteLink(trackId: string) {
    const response = await apiClient.post(
      `/invite/${trackId}`,
      {}, // POST 요청의 body (없으므로 빈 객체)
      {
        withCredentials: true, // 올바른 위치
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.invite ;
  }

  async sendTrackInvites(trackId: string, emails: string[]) {
    const response = await apiClient.post(
      `/invite/track/${trackId}`,
      {
        emails
      },
      {
        withCredentials: true,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data;
  }
}

export default new InviteService();
