import React, { useEffect, useState } from 'react';
import apiClient from '../lib/api';

interface UserAvatarProps {
  userId: string;
  username: string;
  size?: number;
  className?: string;
  maxRetries?: number;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  username,
  size = 24,
  className = '',
  maxRetries = 3,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // presigned URL 가져오기
  useEffect(() => {
    const fetchPresignedUrl = async () => {
      try {
        setIsLoading(true);
        console.log('🖼️ [UserAvatar] Fetching presigned URL for user:', userId);
        
        // 현재 로그인한 사용자인지 확인
        const endpoint = `/users/me/profile-image`; // 일단 현재 사용자만 지원
        
        const response = await apiClient.get(endpoint, {
          withCredentials: true
        });
        
        console.log('🖼️ [UserAvatar] Profile image response:', response.data);
        
        if (response.data.success && response.data.data.imageUrl) {
          setImageUrl(response.data.data.imageUrl);
          setIsError(false);
        } else {
          console.log('🖼️ [UserAvatar] No profile image found, using default');
          setIsError(true);
        }
      } catch (err) {
        console.error('🖼️ [UserAvatar] presigned URL 요청 실패:', err);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchPresignedUrl();
    }
  }, [userId, retryCount]);

  // 이미지 로딩 실패 시 재시도 로직
  const handleImageError = () => {
    console.log('❌ [UserAvatar] Image load error for user:', username);
    if (retryCount < maxRetries) {
      console.warn(`🔄 [UserAvatar] 이미지 로딩 실패 → 재시도 (${retryCount + 1})`);
      setRetryCount((prev) => prev + 1);
    } else {
      console.error('❌ [UserAvatar] 이미지 재시도 초과, using default avatar');
      setIsError(true);
    }
  };

  const handleImageLoad = () => {
    console.log('✅ [UserAvatar] Image loaded successfully for user:', username);
  };

  // 로딩 중이거나 에러 상태 시 기본 아바타 표시
  if (isLoading || isError || !imageUrl) {
    return (
      <div 
        className={`rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {username.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={username}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={handleImageError}
      onLoad={handleImageLoad}
    />
  );
};

export default UserAvatar; 