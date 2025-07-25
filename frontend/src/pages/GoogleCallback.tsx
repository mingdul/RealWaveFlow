import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const GoogleCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        console.log('[GoogleCallback] 백엔드로 리디렉션');
        
        // 백엔드 URL 설정
        const baseUrl = import.meta.env.PROD
          ? 'https://waveflow.pro'
          : 'http://localhost:3000';
        
        // 현재 URL의 쿼리 파라미터를 그대로 백엔드로 전달
        const currentUrl = new URL(window.location.href);
        const backendCallbackUrl = `${baseUrl}/api/auth/google/callback${currentUrl.search}`;
        
        console.log('[GoogleCallback] 백엔드 콜백 URL:', backendCallbackUrl);
        
        // 백엔드로 리디렉션
        window.location.href = backendCallbackUrl;
      } catch (error) {
        console.error('[GoogleCallback] 오류:', error);
        navigate('/login');
      }
    };

    handleGoogleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Google 로그인 처리 중...</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
};

export default GoogleCallback; 