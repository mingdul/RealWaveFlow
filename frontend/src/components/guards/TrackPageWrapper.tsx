import React from 'react';
import { useParams } from 'react-router-dom';
import TrackAccessGuard from './TrackAccessGuard';

interface TrackPageWrapperProps {
  children: React.ReactNode;
}

const TrackPageWrapper: React.FC<TrackPageWrapperProps> = ({ children }) => {
  const { trackId } = useParams<{ trackId: string }>();

  if (!trackId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">잘못된 접근</h1>
          <p className="text-gray-300">트랙 ID가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <TrackAccessGuard trackId={trackId}>
      {children}
    </TrackAccessGuard>
  );
};

export default TrackPageWrapper; 