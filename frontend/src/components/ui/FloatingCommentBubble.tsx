import React, { useEffect, useState } from 'react';

interface FloatingCommentBubbleProps {
  comment: {
    id: string;
    comment: string;
    user?: {
      username: string;
      avatarUrl?: string;
    };
  };
  position: number; // 0-1 비율로 위치
  onClose?: () => void;
  duration?: number; // 표시 시간 (ms), 기본값 3000ms
}

const FloatingCommentBubble: React.FC<FloatingCommentBubbleProps> = ({
  comment,
  position,
  onClose,
  duration = 3000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // 애니메이션 시작
    setIsAnimating(true);
    
    // 자동 사라짐
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // 페이드아웃 애니메이션 시간
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const leftPosition = `${position * 100}%`;

  return (
    <div
      className={`absolute z-30 transition-all duration-300 ${
        isVisible && isAnimating
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-2'
      }`}
      style={{
        left: leftPosition,
        bottom: '100%',
        transform: 'translateX(-50%)',
        marginBottom: '8px',
      }}
    >
      {/* 댓글 버블 */}
      <div className="relative bg-gray-900/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-2xl px-3 py-2 max-w-xs">
        {/* 화살표 */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-900 border-r border-b border-gray-600 rotate-45"></div>
        
        {/* 사용자 정보 */}
        {comment.user && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              {comment.user.avatarUrl ? (
                <img
                  src={comment.user.avatarUrl}
                  alt={comment.user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-bold">
                  {comment.user.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-xs text-blue-400 font-medium">
              {comment.user.username}
            </span>
          </div>
        )}
        
        {/* 댓글 내용 */}
        <div className="text-sm text-white">
          {comment.comment}
        </div>
      </div>
    </div>
  );
};

export default FloatingCommentBubble;