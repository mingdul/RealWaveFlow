import apiClient from '../lib/api';

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  image_url?: string | null;
}

class UserService {
  private userCache = new Map<string, UserProfile>();
  
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // 캐시에서 먼저 확인
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId) || null;
    }

    try {
      // 유저 기본 정보 가져오기 (username 등)
      const profileResponse = await apiClient.get(`/users/${userId}`, {
        withCredentials: true
      });

      if (profileResponse.data.success) {
        const baseProfile = profileResponse.data.data;
        
        // 유저 프로필 이미지 presigned URL 가져오기
        try {
          const imageResponse = await apiClient.get(`/users/${userId}/profile-image`, {
            withCredentials: true
          });
          
          const userProfile: UserProfile = {
            ...baseProfile,
            image_url: imageResponse.data.success ? imageResponse.data.imageUrl : null
          };
          
          this.userCache.set(userId, userProfile);
          return userProfile;
        } catch (imageError) {
          // 이미지만 실패한 경우, 기본 프로필 정보는 반환
          const userProfile: UserProfile = {
            ...baseProfile,
            image_url: null
          };
          
          this.userCache.set(userId, userProfile);
          return userProfile;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch user profile for ${userId}:`, error);
      
      // Fallback: 기본 유저 정보 반환
      const fallbackUser: UserProfile = {
        id: userId,
        username: 'User',
        image_url: null
      };
      this.userCache.set(userId, fallbackUser);
      return fallbackUser;
    }

    return null;
  }

  // 캐시 클리어
  clearCache() {
    this.userCache.clear();
  }
}

export default new UserService();