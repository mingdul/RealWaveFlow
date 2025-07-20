import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import trackAccessService from '../../services/trackAccessService';

interface TrackAccessGuardProps {
  children: React.ReactNode;
  trackId: string;
}

const TrackAccessGuard: React.FC<TrackAccessGuardProps> = ({ children, trackId }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [accessLoading, setAccessLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!isAuthenticated || !trackId) {
        setAccessLoading(false);
        return;
      }

      try {
        console.log('[TrackAccessGuard] Checking access for track:', trackId);
        const result = await trackAccessService.checkTrackAccess(trackId);
        
        console.log('[TrackAccessGuard] Access check result:', result);
        setHasAccess(result.hasAccess);
      } catch (error) {
        console.error('[TrackAccessGuard] Access check failed:', error);
        setHasAccess(false);
      } finally {
        setAccessLoading(false);
      }
    };

    if (!authLoading) {
      checkAccess();
    }
  }, [isAuthenticated, authLoading, trackId]);

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
      </div>
    );
  }

  // 인증되지 않은 사용자
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 접근 권한 확인 중
  if (accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-dashed rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">트랙 접근 권한을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 접근 권한이 없는 경우
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-8">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">접근 권한이 없습니다</h1>
            <p className="text-gray-300 mb-6">
              이 트랙에 접근할 권한이 없습니다. 트랙 소유자나 협업자만 접근할 수 있습니다.
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors mr-4"
            >
              뒤로 가기
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              대시보드로
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 접근 권한이 있는 경우 페이지 렌더링
  return <>{children}</>;
};

export default TrackAccessGuard; 