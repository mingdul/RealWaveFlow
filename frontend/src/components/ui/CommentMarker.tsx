import React from 'react';

interface CommentMarkerProps {
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  position: number; // 0-1 비율로 위치
  onClick?: () => void;
  isActive?: boolean;
}

const CommentMarker: React.FC<CommentMarkerProps> = ({
  user,
  position,
  onClick,
  isActive = false,
}) => {
  const leftPosition = `${position * 100}%`;

  return (
    <div
      className={`absolute z-20 cursor-pointer transition-all duration-200 ${
        isActive ? 'scale-125' : 'hover:scale-110'
      }`}
      style={{
        left: leftPosition,
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
      onClick={onClick}
      title={`${user.username}의 댓글`}
    >
      {/* 아바타 이미지 */}
      <div className={`w-4 h-4 rounded-full border-2 overflow-hidden ${
        isActive ? 'border-blue-400 shadow-lg' : 'border-white shadow-md'
      }`}>
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="w-full h-full object-cover"
            onError={(e) => {
              // 이미지 로드 실패시 기본 아바타로 대체
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {/* 기본 아바타 (이미지 없거나 실패시) */}
        <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold ${
          user.avatarUrl ? 'hidden' : ''
        }`}>
          {user.username.charAt(0).toUpperCase()}
        </div>
      </div>
      
      {/* 액티브 상태 표시 */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
      )}
    </div>
  );
};

export default CommentMarker;