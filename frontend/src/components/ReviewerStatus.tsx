import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Crown } from 'lucide-react';
import { getUpstreamReviews, ReviewerWithStatus } from '../services/upstreamReviewService';

interface ReviewerStatusProps {
  upstreamId: string;
}

const ReviewerStatus: React.FC<ReviewerStatusProps> = ({ upstreamId }) => {
  const [reviewers, setReviewers] = useState<ReviewerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviewers = async () => {
      if (!upstreamId) return;
      
      try {
        setLoading(true);
        const data = await getUpstreamReviews(upstreamId);
        
        // Owner role을 가진 reviewer를 제일 먼저 나오도록 정렬
        const sortedReviewers = [...data].sort((a, b) => {
          // Owner가 있으면 맨 앞으로
          if (a.reviewer.role === 'Owner' && b.reviewer.role !== 'Owner') return -1;
          if (a.reviewer.role !== 'Owner' && b.reviewer.role === 'Owner') return 1;
          
          // 둘 다 Owner가 아니거나 둘 다 Owner인 경우 원래 순서 유지
          return 0;
        });
        
        setReviewers(sortedReviewers);
      } catch (error) {
        console.error('Failed to fetch upstream reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewers();
  }, [upstreamId]);

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

  // 상태별 스타일링 함수들
  const getStatusBorder = (status: string, role: string) => {
    // Owner인 경우 황금색 테두리
    if (role === 'Owner') {
      return 'border-yellow-400';
    }
    
    switch (status) {
      case 'approved':
        return 'border-green-400';
      case 'rejected':
        return 'border-red-400';
      case 'pending':
      default:
        return 'border-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <div className='h-6 w-6 rounded-full bg-green-400 flex items-center justify-center shadow-lg border-2 border-white z-10'>
            <Check size={12} className='text-white' />
          </div>
        );
      case 'rejected':
        return (
          <div className='h-6 w-6 rounded-full bg-red-400 flex items-center justify-center shadow-lg border-2 border-white z-10'>
            <X size={12} className='text-white' />
          </div>
        );
      case 'pending':
      default:
        return (
          <div className='h-6 w-6 rounded-full bg-gray-400 flex items-center justify-center shadow-lg border-2 border-white z-10'>
            <Clock size={12} className='text-white' />
          </div>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      case 'pending':
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '거절됨';
      case 'pending':
      default:
        return '검토 중';
    }
  };

  if (loading) {
    return (
      <div className='flex items-center space-x-4'>
        {/* Loading skeleton */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className='h-12 w-12 animate-pulse rounded-full bg-gray-600'></div>
        ))}
      </div>
    );
  }

  if (reviewers.length === 0) {
    return (
      <div className='flex items-center space-x-2 text-gray-400 text-sm'>
        <span>리뷰어가 할당되지 않았습니다</span>
      </div>
    );
  }

  return (
    <div className='flex items-center space-x-4'>
      {reviewers.map((review) => (
        <div key={review.id} className='relative group'>
          <div
            className={`h-12 w-12 rounded-full border-2 overflow-hidden relative transition-all duration-200 hover:scale-110 ${getStatusBorder(review.status, review.reviewer.role)}`}
          >
            {review.reviewer.image_url ? (
              <img
                src={review.reviewer.image_url}
                alt={review.reviewer.username}
                className='h-full w-full object-cover transition-opacity duration-200 hover:opacity-80'
                onError={handleImageError}
              />
            ) : (
              <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600 transition-all duration-200 hover:from-purple-500 hover:to-purple-700'>
                <span className='text-sm font-semibold text-white'>
                  {review.reviewer.username?.charAt(0)?.toUpperCase() || 'R'}
                </span>
              </div>
            )}

            {/* Fallback div */}
            <div
              className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600 transition-all duration-200 hover:from-purple-500 hover:to-purple-700'
              style={{ display: 'none' }}
            >
              <span className='text-sm font-semibold text-white'>
                {review.reviewer.username?.charAt(0)?.toUpperCase() || 'R'}
              </span>
            </div>
          </div>

          {/* Owner Crown - 왕관을 프로필 밖으로 이동 */}
          {review.reviewer.role === 'Owner' && (
            <div className='absolute -top-2 -left-2 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg border-2 border-white z-10'>
              <Crown size={12} className='text-yellow-800' />
            </div>
          )}

          {/* Status Icon */}
          <div className='absolute -top-2 -right-2'>
            {getStatusIcon(review.status)}
          </div>

          {/* Reviewer Tooltip */}
          <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20'>
            <div className='bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl border border-gray-700'>
              <div className='font-semibold'>{review.reviewer.username}</div>
              <div className='text-purple-400 text-xs'>{review.reviewer.role}</div>
              <div className={`text-xs ${getStatusColor(review.status)}`}>
                {getStatusText(review.status)}
              </div>
              {/* 화살표 */}
              <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900'></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReviewerStatus;