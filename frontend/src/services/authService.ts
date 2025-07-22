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
    // API 클라이언트의 baseURL 사용
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
        { username: name },
        { withCredentials: true }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '이름 변경에 실패했습니다.');
    }
  }

  /**
   * 프로필 이미지 업로드 (s3UploadService.uploadImage 방식 사용)
   * @returns S3 key(path) - URL이 아닌 S3 path만 반환
   */
  async uploadProfileImage(imageFile: File): Promise<string> {
    try {
      // 프로필 이미지용 파일명 생성 (타임스탬프 포함)
      const timestamp = Date.now();
      const sanitizedName = imageFile.name.replace(/[^\w\s.-]/g, '_');
      const profileFileName = `profile_${timestamp}_${sanitizedName}`;

      console.log('🖼️ [uploadProfileImage] Starting profile image upload...');
      console.log('🖼️ [uploadProfileImage] Original filename:', imageFile.name);
      console.log('🖼️ [uploadProfileImage] Profile filename:', profileFileName);

      // s3UploadService의 이미지 업로드 API 사용 (/images/upload-url)
      const presignedResponse = await apiClient.post('/images/upload-url', {
        fileName: profileFileName,
        contentType: imageFile.type,
      }, { withCredentials: true });

      if (!presignedResponse.data.success || !presignedResponse.data.data) {
        throw new Error('프로필 이미지 presigned URL 요청 실패');
      }

      const { uploadUrl, key } = presignedResponse.data.data;
      console.log('🔑 [uploadProfileImage] S3 key:', key);
      console.log('🔗 [uploadProfileImage] Upload URL obtained');

      // XMLHttpRequest를 사용한 S3 직접 업로드 (s3UploadService 방식과 동일)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total);
            console.log(`🔄 [uploadProfileImage] Upload progress: ${progress}%`);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('✅ [uploadProfileImage] Upload completed successfully');
            resolve();
          } else {
            reject(new Error(`S3 업로드 실패: HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('프로필 이미지 업로드 중 네트워크 오류'));
        };

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', imageFile.type);
        xhr.send(imageFile);
      });

      // ⭐ S3 URL이 아닌 S3 key(path)만 반환
      console.log('📁 [uploadProfileImage] Returning S3 key (path):', key);
      return key;

    } catch (error: any) {
      console.error('❌ [uploadProfileImage] Profile image upload error:', error);
      throw new Error(error.response?.data?.message || error.message || '프로필 이미지 업로드에 실패했습니다.');
    }
  }
}

export default new AuthService();
