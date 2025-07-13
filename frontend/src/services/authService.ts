import apiClient, { ApiResponse } from '../lib/api';
import { LoginDto, RegisterDto, User } from '../types/api';

class AuthService {
  /**
   * 사용자 로그인
   */
  async login(credentials: LoginDto): Promise<ApiResponse<{ user: User }>> {
    try {
      const res = await apiClient.post<ApiResponse<{ user: User }>>(
        '/auth/login',
        credentials,
        { withCredentials: true }
      );
      console.log('[authService.login] res.data =', res.data);
      return res.data;
    } catch (err: any) {
      console.error('[authService.login] error', err.response || err);
      throw new Error(err.response?.data?.message || '로그인에 실패했습니다.');
    }
  }

  /**
   * 사용자 회원가입
   */
  async register(userData: RegisterDto): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.post<ApiResponse<User>>(
        '/users/register',
        userData,
        {
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '회원가입에 실패했습니다.');
    }
  }

  /**
   * Google OAuth 로그인
   */
  loginWithGoogle(): void {
    window.location.href = `${apiClient.defaults.baseURL}/auth/google`;
  }

  /**
   * 로그아웃 (쿠키 삭제는 서버에서 처리됨)
   */
  async logout(): Promise<void> {
    try {
      await apiClient.get('/auth/logout');
    } catch (e) {
      console.warn('로그아웃 요청 실패', e);
    }
  }

  /**
   * 서버에서 현재 로그인된 사용자 정보 요청
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
      if (response.data.success && response.data.data) {
        return response.data.data.user;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getCurrentUserFromServer(): Promise<User | null> {
    try {
      const { data: envelope } = await apiClient.get<ApiResponse<{ user: User }>>(
        '/auth/me',
        { withCredentials: true }
      );
      console.log('[authService.getCurrentUserFromServer] envelope =', envelope);
      // success 플래그와 data 존재 여부를 명확히 체크
      if (envelope.success && envelope.data) {
        return envelope.data.user;
      }
      return null;
    } catch (error) {
      console.error('[authService.getCurrentUserFromServer] error =', error);
      return null;
    }
  }

  /**
   * 비밀번호 찾기
   */
  async forgotPassword(email: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/users/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '비밀번호 찾기에 실패했습니다.');
    }
  }
}

export default new AuthService();
