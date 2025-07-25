import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        console.log('[GoogleCallback] 콜백 처리 시작');
        const success = await authService.handleGoogleCallback();
        
        if (success) {
          console.log('[GoogleCallback] 로그인 성공, 대시보드로 이동');
          navigate('/dashboard');
        } else {
          console.log('[GoogleCallback] 로그인 실패, 로그인 페이지로 이동');
          navigate('/login');
        }
      } catch (error) {
        console.error('[GoogleCallback] 오류 발생:', error);
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