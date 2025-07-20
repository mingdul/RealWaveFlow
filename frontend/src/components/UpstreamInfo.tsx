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
    <div className='mb-8 rounded-xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-600/50 p-6 backdrop-blur-sm shadow-xl'>
      {/* Description Section */}
      <div className='mb-6'>
        <h3 className='text-lg font-semibold text-white mb-3 flex items-center gap-2'>
          <span className='w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full'></span>
          Upstream Infomation
        </h3>
        <div className='bg-gray-900/40 rounded-lg p-4 border border-gray-700/50'>
          <p className='text-gray-200 text-base leading-relaxed whitespace-pre-wrap'>
            {upstream.description || '설명이 없습니다.'}
          </p>
        </div>
      </div>
      
      {/* Creator and Reviewers Section - 한 줄에 표시 */}
      <div className='mb-6'>
        <h4 className='text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide'>작성자 및 리뷰어</h4>
        <div className='flex items-center gap-6 p-4 bg-gray-900/30 rounded-lg border border-gray-700/30'>
          
          {/* Creator Section */}
          <div className='flex items-center gap-3'>
            <div className='text-xs text-blue-400 font-medium uppercase tracking-wide'>Creator</div>
            <div className='relative'>
              <div className='h-12 w-12 rounded-full overflow-hidden border-2 border-blue-400 shadow-lg'>
                <div className='h-full w-full rounded-full overflow-hidden bg-gray-800'>
                  {upstream.user?.image_url ? (
                    <img
                      src={upstream.user.image_url}
                      alt={upstream.user.username}
                      className='h-full w-full object-cover transition-transform duration-200 hover:scale-110'
                      onError={handleImageError}
                    />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600'>
                      <span className='text-sm font-bold text-white'>
                        {upstream.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}

                  {/* Fallback div */}
                  <div
                    className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600'
                    style={{ display: 'none' }}
                  >
                    <span className='text-sm font-bold text-white'>
                      {upstream.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Creator Badge */}
              <div className='absolute -bottom-1 -right-1 bg-blue-500 rounded-full px-1.5 py-0.5 text-xs font-medium text-white shadow-lg border-2 border-gray-800'>
                ✓
              </div>
            </div>
            <div className='text-sm font-medium text-white'>
              {upstream.user?.username || 'Unknown User'}
            </div>
          </div>

          {/* Divider */}
          <div className='h-8 w-px bg-gray-600'></div>
          
          {/* Reviewers Section */}
          <div className='flex-1'>
            <div className='flex items-center gap-3'>
              <div className='text-xs text-green-400 font-medium uppercase tracking-wide flex items-center gap-1'>
                <span className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></span>
                Reviewers
              </div>
              <div className='flex-1'>
                <ReviewerStatus upstreamId={upstream.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpstreamInfo;