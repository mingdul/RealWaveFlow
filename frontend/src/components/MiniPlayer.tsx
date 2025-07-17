import React, { useState, useRef } from 'react';

interface MiniPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onFastForward: (active: boolean) => void;
  onRewind: (active: boolean) => void;
  onReturnToStart: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onFastForward,
  onRewind,
  onReturnToStart
}) => {
  const [isFFPressed, setIsFFPressed] = useState(false);
  const [isRewindPressed, setIsRewindPressed] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    onSeek(time);
  };

  const handleVolumeClick = (e: React.MouseEvent) => {
    if (!volumeRef.current) return;
    
    const rect = volumeRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    
    onVolumeChange(percentage);
  };

  const handleFastForward = (active: boolean) => {
    setIsFFPressed(active);
    onFastForward(active);
  };

  const handleRewind = (active: boolean) => {
    setIsRewindPressed(active);
    onRewind(active);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-2 sm:p-3 md:p-4 z-50">
      <div className="max-w-full lg:max-w-7xl mx-auto">
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative h-1 sm:h-1.5 md:h-2 bg-gray-700 rounded-full mb-2 sm:mb-3 md:mb-4 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className="absolute top-1/2 w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-white rounded-full shadow-lg transform -translate-y-1/2"
            style={{ left: `${progressPercentage}%`, marginLeft: '-4px' }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
            <button
              onClick={onReturnToStart}
              className="p-1 sm:p-1.5 md:p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Return to Start"
            >
              <span className="text-base sm:text-lg md:text-xl">⏮</span>
            </button>
            
            <button
              onMouseDown={() => handleRewind(true)}
              onMouseUp={() => handleRewind(false)}
              onMouseLeave={() => handleRewind(false)}
              className={`p-1 sm:p-1.5 md:p-2 hover:bg-gray-800 rounded-lg transition-colors ${
                isRewindPressed ? 'bg-gray-800' : ''
              }`}
              title="Rewind (3x)"
            >
              <span className="text-base sm:text-lg md:text-xl">⏪</span>
            </button>
            
            <button
              onClick={onPlayPause}
              className="p-2 sm:p-2.5 md:p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              <span className="text-base sm:text-lg md:text-xl text-white">
                {isPlaying ? '⏸' : '▶'}
              </span>
            </button>
            
            <button
              onMouseDown={() => handleFastForward(true)}
              onMouseUp={() => handleFastForward(false)}
              onMouseLeave={() => handleFastForward(false)}
              className={`p-1 sm:p-1.5 md:p-2 hover:bg-gray-800 rounded-lg transition-colors ${
                isFFPressed ? 'bg-gray-800' : ''
              }`}
              title="Fast Forward (3x)"
            >
              <span className="text-base sm:text-lg md:text-xl">⏩</span>
            </button>
          </div>

          {/* Center time display */}
          <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm text-gray-300">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Right controls - Volume */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="text-sm sm:text-base md:text-lg">🔊</span>
            <div
              ref={volumeRef}
              className="relative w-12 sm:w-16 md:w-20 h-1 sm:h-1.5 md:h-2 bg-gray-700 rounded-full cursor-pointer"
              onClick={handleVolumeClick}
            >
              <div
                className="absolute top-0 left-0 h-full bg-green-500 rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
              <div
                className="absolute top-1/2 w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-white rounded-full shadow-lg transform -translate-y-1/2"
                style={{ left: `${volume * 100}%`, marginLeft: '-4px' }}
              />
            </div>
            <span className="hidden sm:inline text-xs sm:text-sm text-gray-400 w-6 sm:w-8">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
