import React, { useEffect, useState } from 'react';
import apiClient from '../lib/api';
import { isDefaultImage, getDefaultImagePath } from '../utils/imageUtils';

interface Props {
  trackId?: string;
  imageUrl?: string;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
  maxRetries?: number;
}

const PresignedImage: React.FC<Props> = ({
  trackId,
  imageUrl: propImageUrl,
  className = '',
  alt = '',
  style,
  maxRetries = 3,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isError, setIsError] = useState(false);

  // 기본 이미지인지 확인
  const isDefault = propImageUrl ? isDefaultImage(propImageUrl) : false;

  // presigned URL 가져오기 (기본 이미지가 아닌 경우에만)
  useEffect(() => {
    if (isDefault) {
      // 기본 이미지인 경우 public 경로로 설정
      setImageUrl(getDefaultImagePath(propImageUrl!));
      setIsError(false);
      return;
    }

    if (!trackId) {
      console.error('trackId가 제공되지 않았습니다.');
      setIsError(true);
      return;
    }

    const fetchPresignedUrl = async () => {
      try {
        const response = await apiClient.get(`/images/${trackId}`);
        setImageUrl(response.data.imageUrl);
        setIsError(false);
      } catch (err) {
        console.error('presigned URL 요청 실패:', err);
        setIsError(true);
      }
    };

    fetchPresignedUrl();
  }, [trackId, retryCount, propImageUrl, isDefault]);

  // 이미지 로딩 실패 시 재시도 로직
  const handleImageError = () => {
    if (retryCount < maxRetries) {
      console.warn(`이미지 로딩 실패 → 재시도 (${retryCount + 1})`);
      setRetryCount((prev) => prev + 1);
    } else {
      console.error('이미지 재시도 초과');
      setImageUrl('/default-cover.jpg'); // fallback 이미지
      setIsError(false);
    }
  };

  // 로딩 또는 실패 상태 시 placeholder 보여주기 (애니메이션 제거 가능)
  if (!imageUrl && !isError) {
    return (
      <div
        className={`w-full h-full bg-neutral-800 ${className}`}
        style={style}
      />
    );
  }

  return (
    <img
      src={imageUrl || ''}
      alt={alt}
      onError={handleImageError}
      className={className}
      style={style}
    />
  );
};

export default PresignedImage;
