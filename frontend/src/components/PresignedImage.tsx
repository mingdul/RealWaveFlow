// components/PresignedImage.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Props {
  trackId: string;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
  maxRetries?: number;
}

const PresignedImage: React.FC<Props> = ({
  trackId,
  className = '',
  alt = '',
  style,
  maxRetries = 3,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchPresignedUrl = async () => {
    try {
      const response = await axios.get(`/images/${trackId}`);
      setImageUrl(response.data.imageUrl);
    } catch (err) {
      console.error('presigned URL 요청 실패:', err);
    }
  };

  useEffect(() => {
    fetchPresignedUrl();
  }, [trackId]);

  const handleImageError = () => {
    if (retryCount < maxRetries) {
      console.warn(`이미지 로딩 실패 → 재시도 (${retryCount + 1})`);
      setRetryCount((prev) => prev + 1);
      fetchPresignedUrl();
    } else {
      console.error('이미지 재시도 초과');
      setImageUrl('/default-cover.jpg'); // 기본 이미지 fallback (옵션)
    }
  };

  if (!imageUrl) {
    return (
      <div className={`w-80 h-80 bg-gray-800 animate-pulse rounded-lg ${className}`} />
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      onError={handleImageError}
      className={className}
      style={style}
    />
  );
};

export default PresignedImage;
