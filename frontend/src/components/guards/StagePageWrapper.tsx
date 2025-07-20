import React from 'react';
import { useParams } from 'react-router-dom';
import StageAccessGuard from './StageAccessGuard';

interface StagePageWrapperProps {
  children: React.ReactNode;
}

const StagePageWrapper: React.FC<StagePageWrapperProps> = ({ children }) => {
  const { stageId } = useParams<{ stageId: string }>();

  if (!stageId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">잘못된 접근</h1>
          <p className="text-gray-300">스테이지 ID가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <StageAccessGuard stageId={stageId}>
      {children}
    </StageAccessGuard>
  );
};

export default StagePageWrapper; 