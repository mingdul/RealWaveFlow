import React from 'react';
import { useParams } from 'react-router-dom';
import UpstreamAccessGuard from './UpstreamAccessGuard';

interface UpstreamPageWrapperProps {
  children: React.ReactNode;
}

const UpstreamPageWrapper: React.FC<UpstreamPageWrapperProps> = ({ children }) => {
  const { upstreamId } = useParams<{ upstreamId: string }>();

  if (!upstreamId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">잘못된 접근</h1>
          <p className="text-gray-300">업스트림 ID가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <UpstreamAccessGuard upstreamId={upstreamId}>
      {children}
    </UpstreamAccessGuard>
  );
};

export default UpstreamPageWrapper; 