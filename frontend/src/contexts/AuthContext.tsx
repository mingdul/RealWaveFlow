import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { User, LoginDto, RegisterDto } from '../types/api';
import authService from '../services/authService';
import apiClient from '../lib/api';

// 상태 타입
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 액션 타입
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// 초기 상태
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// 리듀서
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false, error: null };
    case 'AUTH_FAILURE':
      return { ...state, user: null, isAuthenticated: false, isLoading: false, error: action.payload };
    case 'AUTH_LOGOUT':
      return { ...state, user: null, isAuthenticated: false, isLoading: false, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

// 컨텍스트 타입
interface AuthContextType extends AuthState {
  login: (credentials: LoginDto) => Promise<void>;
  register: (userData: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
  clearError: () => void;
  updateProfile: (profileData: { name?: string; profileImage?: File }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 마운트 시 단 한 번만 실행 (초기 인증 체크)
  useEffect(() => {
    const init = async () => {
      dispatch({ type: 'AUTH_START' });
      try {
        const user = await authService.getCurrentUserFromServer();
        if (user) {
          console.log('🔐 [AuthProvider] User authenticated:', user.email);
          dispatch({ type: 'AUTH_SUCCESS', payload: user });
        } else {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      } catch (error) {
        console.error('🔐 [AuthProvider] Auth check failed:', error);
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };
    init();
  }, []);

  const login = async (credentials: LoginDto) => {
    dispatch({ type: 'AUTH_START' });
    try {
      await authService.login(credentials);
      const user = await authService.getCurrentUserFromServer();
      if (!user) throw new Error('사용자 정보를 가져올 수 없습니다.');
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (err: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: err.message });
      throw err;
    }
  };

  const register = async (userData: RegisterDto) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const res = await authService.register(userData);
      if (res.success) dispatch({ type: 'AUTH_LOGOUT' });
      else throw new Error(res.message || '회원가입에 실패했습니다.');
    } catch (err: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: err.message });
      throw err;
    }
  };

  const logout = async () => {
    await authService.logout();
    dispatch({ type: 'AUTH_LOGOUT' });
  };

  const loginWithGoogle = () => {
    authService.loginWithGoogle();
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  const updateProfile = async (profileData: { name?: string; profileImage?: File }) => {
    if (!state.user) throw new Error('로그인이 필요합니다.');
    
    dispatch({ type: 'AUTH_START' });
    try {
      let imagePath: string | undefined;
      
      // 프로필 이미지 업로드 처리 (s3UploadService 방식 사용)
      if (profileData.profileImage) {
        imagePath = await authService.uploadProfileImage(profileData.profileImage);
        console.log('🖼️ [updateProfile] Image uploaded, S3 path:', imagePath);
      }
      
      // 사용자 정보 업데이트를 위한 데이터 준비
      const updateData: any = {};
      
      // 이름 변경 (username 필드 사용)
      if (profileData.name && profileData.name !== state.user.username) {
        updateData.username = profileData.name;
      }
      
      // 이미지 S3 path 설정 (URL이 아닌 S3 key)
      if (imagePath) {
        updateData.image_url = imagePath;
        console.log('📁 [updateProfile] Setting image_url to S3 path:', imagePath);
      }
      
      // 단일 API 호출로 통합 처리
      if (Object.keys(updateData).length > 0) {
        console.log('🔄 [updateProfile] Updating profile via PUT /users/me:', updateData);
        console.log('🔄 [updateProfile] Request headers:', { 'Content-Type': 'application/json' });
        
        const response = await apiClient.put('/users/me', updateData, { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ [updateProfile] PUT /users/me response:', response.data);
      }
      
      // 업데이트된 사용자 정보 가져오기
      console.log('🔄 [updateProfile] Fetching updated user info...');
      const updatedUser = await authService.getCurrentUserFromServer();
      if (!updatedUser) {
        throw new Error('업데이트된 사용자 정보를 가져올 수 없습니다.');
      }
      
      console.log('👤 [updateProfile] Updated user received:', updatedUser);
      dispatch({ type: 'AUTH_SUCCESS', payload: updatedUser });
      
    } catch (err: any) {
      console.error('❌ [updateProfile] Error:', err);
      dispatch({ type: 'AUTH_FAILURE', payload: err.message });
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        loginWithGoogle,
        clearError,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
