import React, { useState, useEffect } from 'react';
import ReviewerStatus from './ReviewerStatus';
import userService from '../services/userService';

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
  const [userProfile, setUserProfile] = useState<{
    id: string;
    username: string;
    image_url?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!upstream.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const profile = await userService.getUserProfile(upstream.user.id);
        setUserProfile(profile);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        setUserProfile(upstream.user);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [upstream.user?.id]);

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

  const displayUser = userProfile || upstream.user;

  return (
    <div className='mb-8 rounded-xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-600/50 p-6 backdrop-blur-sm shadow-xl'>
      {/* Description Section */}
      <div className='mb-6'>
        <h3 className='text-lg font-semibold text-white mb-3 flex items-center gap-2'>
          <span className='w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full'></span>
          업스트림 설명
        </h3>
        <div className='bg-gray-900/40 rounded-lg p-4 border border-gray-700/50'>
          <p className='text-gray-200 text-base leading-relaxed whitespace-pre-wrap'>
            {upstream.description || '설명이 없습니다.'}
          </p>
        </div>
      </div>
      
      {/* Creator Info Section */}
      <div className='mb-6'>
        <h4 className='text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide'>작성자 정보</h4>
        <div className='flex items-center gap-4 p-4 bg-gray-900/30 rounded-lg border border-gray-700/30'>
          {/* Creator Profile Image */}
          <div className='relative'>
            <div className='h-14 w-14 rounded-full overflow-hidden border-2 border-blue-400 shadow-lg'>
              <div className='h-full w-full rounded-full overflow-hidden bg-gray-800'>
                {loading ? (
                  <div className='h-full w-full animate-pulse bg-gray-600'></div>
                ) : displayUser?.image_url ? (
                  <img
                    src={displayUser.image_url}
                    alt={displayUser.username}
                    className='h-full w-full object-cover transition-transform duration-200 hover:scale-110'
                    onError={handleImageError}
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600'>
                    <span className='text-lg font-bold text-white'>
                      {displayUser?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}

                {/* Fallback div */}
                <div
                  className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600'
                  style={{ display: 'none' }}
                >
                  <span className='text-lg font-bold text-white'>
                    {displayUser?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Creator Badge */}
            <div className='absolute -bottom-1 -right-1 bg-blue-500 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-lg border-2 border-gray-800'>
              Creator
            </div>
          </div>

          {/* Creator Details */}
          <div className='flex-1'>
            <div className='text-lg font-semibold text-white mb-1'>
              {loading ? (
                <div className='h-5 w-24 animate-pulse bg-gray-600 rounded'></div>
              ) : (
                displayUser?.username || 'Unknown User'
              )}
            </div>
            <div className='text-sm text-blue-400 font-medium'>업스트림 작성자</div>
          </div>
        </div>
      </div>
      
      {/* Reviewer Status Section */}
      <div>
        <h4 className='text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide flex items-center gap-2'>
          <span className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></span>
          리뷰어 상태
        </h4>
        <div className='p-4 bg-gray-900/30 rounded-lg border border-gray-700/30'>
          <ReviewerStatus upstreamId={upstream.id} />
        </div>
      </div>
    </div>
  );
};

export default UpstreamInfo;