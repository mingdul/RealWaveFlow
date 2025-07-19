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

  /**
   * 사용자 이름 변경
   */
  async updateUserName(userId: string, name: string): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.patch<ApiResponse<User>>(
        `/users/${userId}`,
        { name },
        { withCredentials: true }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '이름 변경에 실패했습니다.');
    }
  }

  /**
   * 프로필 이미지 업로드
   */
  async uploadProfileImage(imageFile: File): Promise<string> {
    try {
      // 한국어 파일명 처리 (기존 업로드 로직 참고)
      const sanitizedFileName = `profile_${Date.now()}_${imageFile.name.replace(/[^\w\s.-]/g, '_')}`;
      
      // 1. 업로드 추가 (S3 presigned URL 생성)
      const addUploadResponse = await apiClient.post('/uploads/add-upload', {
        files: [{
          file_name: sanitizedFileName,
          file_size: imageFile.size,
          content_type: imageFile.type
        }]
      }, { withCredentials: true });

      if (!addUploadResponse.data.success) {
        throw new Error('업로드 요청 생성에 실패했습니다.');
      }

      const uploadData = addUploadResponse.data.data[0];
      
      // 2. Presigned URL 생성
      const presignedResponse = await apiClient.post('/uploads/presigned-urls', {
        upload_id: uploadData.upload_id,
        part_numbers: [1]
      }, { withCredentials: true });

      if (!presignedResponse.data.success) {
        throw new Error('업로드 URL 생성에 실패했습니다.');
      }

      const presignedUrl = presignedResponse.data.data.upload_urls[0];

      // 3. S3에 직접 업로드
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: imageFile,
        headers: {
          'Content-Type': imageFile.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('S3 업로드에 실패했습니다.');
      }

      // 4. 업로드 완료 처리
      const completeResponse = await apiClient.post('/uploads/complete', {
        upload_id: uploadData.upload_id,
        parts: [{
          PartNumber: 1,
          ETag: uploadResponse.headers.get('ETag') || '"completed"'
        }]
      }, { withCredentials: true });

      if (!completeResponse.data.success) {
        throw new Error('업로드 완료 처리에 실패했습니다.');
      }

      // S3 이미지 URL 반환
      const s3ImageUrl = `https://${process.env.VITE_AWS_S3_BUCKET || 'waveflow-uploads'}.s3.amazonaws.com/${uploadData.s3_key}`;
      return s3ImageUrl;

    } catch (error: any) {
      console.error('Profile image upload error:', error);
      throw new Error(error.response?.data?.message || error.message || '프로필 이미지 업로드에 실패했습니다.');
    }
  }
}

export default new AuthService();
