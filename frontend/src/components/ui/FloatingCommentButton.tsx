import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send } from 'lucide-react';

interface FloatingCommentButtonProps {
  currentTime: number;
  duration: number;
  containerWidth: number;
  onAddComment: (time: number, comment: string) => void;
  disabled?: boolean;
}

const FloatingCommentButton: React.FC<FloatingCommentButtonProps> = ({
  currentTime,
  duration,
  containerWidth,
  onAddComment,
  disabled = false,
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 버튼 위치 계산 (프로그레스에 따라)
  const progress = duration > 0 ? (currentTime / duration) : 0;
  const buttonX = Math.max(20, Math.min(containerWidth - 60, progress * containerWidth));

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current && 
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
        setCommentText('');
      }
    };

    if (showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopup]);

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onAddComment(currentTime, commentText.trim());
      setCommentText('');
      setShowPopup(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (disabled) return null;

  return (
    <div className="relative">
      {/* 플로팅 댓글 버튼 */}
      <button
        ref={buttonRef}
        className={`absolute z-30 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
          showPopup || isHovering
            ? 'bg-blue-600 text-white scale-110 shadow-lg' 
            : 'bg-gray-700/80 text-gray-300 hover:bg-blue-600 hover:text-white hover:scale-105'
        }`}
        style={{
          left: `${buttonX}px`,
          top: '-12px',
          transform: 'translateX(-50%)',
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => {
          setShowPopup(!showPopup);
          setIsHovering(false);
        }}
        title={`${formatTime(currentTime)}에 댓글 추가`}
      >
        <MessageCircle size={16} />
      </button>

      {/* 댓글 입력 팝업 */}
      {showPopup && (
        <div
          ref={popupRef}
          className="absolute z-40 bg-gray-900/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-2xl p-4 min-w-80"
          style={{
            left: `${buttonX}px`,
            top: '20px',
            transform: 'translateX(-50%)',
          }}
        >
          {/* 팝업 화살표 */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-900 border-l border-t border-gray-600 rotate-45"></div>
          
          {/* 헤더 */}
          <div className="mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-400 font-medium">댓글 추가</span>
              <span className="text-gray-400">@</span>
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-mono">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>

          {/* 입력 영역 */}
          <div className="space-y-3">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="이 시점에 대한 댓글을 작성하세요..."
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 text-sm resize-none focus:border-blue-500 focus:outline-none"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleSubmitComment();
                }
              }}
            />
            
            {/* 버튼 영역 */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">
                Ctrl+Enter로 빠른 전송
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPopup(false);
                    setCommentText('');
                  }}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-1"
                >
                  <Send size={12} />
                  댓글 작성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingCommentButton;