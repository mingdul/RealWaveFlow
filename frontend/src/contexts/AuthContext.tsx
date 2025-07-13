import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { User, LoginDto, RegisterDto } from '../types/api';
import authService from '../services/authService';

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
        if (user) dispatch({ type: 'AUTH_SUCCESS', payload: user });
        else dispatch({ type: 'AUTH_LOGOUT' });
      } catch {
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

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        loginWithGoogle,
        clearError,
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
