import React from 'react';
import ReviewerStatus from './ReviewerStatus';

interface UpstreamInfoProps {
  upstream: {
    id: string;
    description: string;
    user?: {
      id: string;
      username: string;
      image_url?: string | null;
    };
  };
}

const UpstreamInfo: React.FC<UpstreamInfoProps> = ({ upstream }) => {
  // 이미지 에러 핸들링을 위한 fallback
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const fallbackDiv = target.nextElementSibling as HTMLElement;
    if (fallbackDiv) {
      fallbackDiv.style.display = 'flex';
    }
  };

  return (
    <div className='mb-6 rounded-lg bg-gray-800/50 border border-gray-700 p-4'>
      {/* Description */}
      <div className='text-sm text-gray-300 mb-3'>
        {upstream.description}
      </div>
      
      {/* Creator Info */}
      <div className='flex items-center gap-3 mb-3 pb-3 border-b border-gray-600'>
        {/* Creator Profile Image */}
        <div className='relative'>
          <div className='h-10 w-10 rounded-full overflow-hidden border-2 border-blue-400'>
            {upstream.user?.image_url ? (
              <img
                src={upstream.user.image_url}
                alt={upstream.user.username}
                className='h-full w-full object-cover'
                onError={handleImageError}
              />
            ) : (
              <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600'>
                <span className='text-sm font-semibold text-white'>
                  {upstream.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}

            {/* Fallback div */}
            <div
              className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600'
              style={{ display: 'none' }}
            >
              <span className='text-sm font-semibold text-white'>
                {upstream.user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>

        {/* Creator Name */}
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-blue-400'>작성자:</span>
          <span className='text-white font-medium'>{upstream.user?.username || 'Unknown'}</span>
        </div>
      </div>
      
      {/* Reviewer Status */}
      <div>
        <div className='text-xs text-gray-400 mb-2'>리뷰어 상태</div>
        <ReviewerStatus upstreamId={upstream.id} />
      </div>
    </div>
  );
};

export default UpstreamInfo;