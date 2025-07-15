import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// API 기본 설정 - 환경변수 사용
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

console.log('[DEBUG] API_BASE_URL:', API_BASE_URL);

// Axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // JWT 쿠키 포함
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 쿠키는 자동으로 포함됨
apiClient.interceptors.request.use(
  (config) => {
    console.log('[DEBUG] Axios request:', config.method?.toUpperCase(), config.url);
    console.log('[DEBUG] Request headers:', config.headers);
    console.log('[DEBUG] withCredentials:', config.withCredentials);
    return config;
  },
  (error) => {
    console.error('[DEBUG] Axios request error:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('[DEBUG] Axios response:', response.status, response.config.url);
    console.log('[DEBUG] Response headers:', response.headers);
    return response;
  },
  (error: AxiosError) => {
    console.error('[DEBUG] Axios response error:', error.response?.status, error.config?.url);
    console.error('[DEBUG] Error details:', error.response?.data);
    
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // 인증 실패 시 로그인 페이지로 리다이렉트 (이미 로그인 페이지가 아닌 경우만)
      if(window.location.pathname === '/'){
        console.log('[DEBUG] Redirecting to login due to 401');
      }else{
        console.log('[DEBUG] Redirecting to login due to 401');
        window.location.href = '/login';
      } 
    }
    return Promise.reject(error);
  }
);

// API 응답 타입 정의
export interface ApiResponse<T = any> {
  length: number;
  find(arg0: (stage: any) => boolean): import("../types/api").Stage | PromiseLike<import("../types/api").Stage | null> | null;
  success: boolean;
  message?: string;
  data?: T;
}

// API 에러 타입 정의
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export default apiClient;
