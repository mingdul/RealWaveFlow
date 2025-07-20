import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { getDisplayFilename } from '../utils/filenameUtils';

interface AudioPlayerProps {
  src: string;
  fileName: string;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  currentTime?: number;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  muted?: boolean;
  onMuteToggle?: () => void;
  className?: string;
  showProgressBar?: boolean;
  audioRef?: React.MutableRefObject<HTMLAudioElement | null>;
  onProgressBarClick?: (newTime: number) => void;
  onAudioReady?: (audio: HTMLAudioElement) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  fileName,
  onTimeUpdate,
  onLoadedMetadata,
  isPlaying = false,
  onPlayPause,
  currentTime = 0,
  volume = 1,
  onVolumeChange,
  muted = false,
  onMuteToggle,
  className = '',
  showProgressBar = false,
  audioRef: externalAudioRef,
  onProgressBarClick,
  onAudioReady
}) => {
  const internalAudioRef = useRef<HTMLAudioElement>(null);
  const audioRef = internalAudioRef;
  const [duration, setDuration] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // External ref 설정 및 onAudioReady 콜백
  useEffect(() => {
    if (audioRef.current) {
      if (externalAudioRef) {
        externalAudioRef.current = audioRef.current;
      }
      if (onAudioReady) {
        onAudioReady(audioRef.current);
      }
    }
  }, [externalAudioRef, onAudioReady]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoading(false);
      if (onLoadedMetadata) {
        onLoadedMetadata(audio.duration);
      }
    };

    const handleError = () => {
      setError('오디오를 로드할 수 없습니다');
      setLoading(false);
    };

    const handleCanPlay = () => {
      setLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [onTimeUpdate, onLoadedMetadata]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (Math.abs(audio.currentTime - currentTime) > 0.1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = muted;
  }, [muted]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };

  if (error) {
    return (
      <div className={`flex items-center gap-2 p-2 bg-red-900/20 rounded ${className}`}>
        <span className="text-red-400 text-sm">{error}</span>
      </div>
    );
  }

return (
  <div className={`flex flex-col gap-1 p-3 bg-gray-800 rounded-lg ${className}`}>
    <div className="flex items-center gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={onPlayPause}
        disabled={loading}
        className="flex items-center justify-center w-10 h-10 disabled:opacity-50 hover:scale-105 transition-all duration-200 disabled:hover:scale-100 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause size={20} className="text-white drop-shadow-md" />
        ) : (
          <Play size={20} fill="black" className="text-black ml-0.5 drop-shadow-md" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate mb-1">
          {getDisplayFilename(fileName)}
        </div>
        <div className="text-xs text-gray-400">
          {loading ? 'Loading...' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onMuteToggle}
          className={`p-1 rounded-lg transition-all duration-200 transform hover:scale-105 ${
            muted ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-gray-300 hover:text-white shadow-sm hover:shadow-md'
          }`}
        >
          {muted ? <VolumeX size={16} className="drop-shadow-sm"/> : <Volume2 size={16} className="drop-shadow-sm"/>}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(muted ? 0 : volume) * 100}%, #4b5563 ${(muted ? 0 : volume) * 100}%, #4b5563 100%)`
          }}
        />
      </div>
    </div>

    {/* ✅ 조건부 프로그레스바 */}
    {showProgressBar && (
    <div 
      className="w-full h-1 bg-gray-700 rounded overflow-hidden mt-1 cursor-pointer"
      onClick={(e) => {
        if (onProgressBarClick && duration > 0) {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const barWidth = rect.width;
          const newTime = (clickX / barWidth) * duration;
          onProgressBarClick(newTime);
        }
      }}
    >
      <div
        className="h-full bg-purple-500 transition-all duration-200"
        style={{ width: `${(currentTime / duration) * 100}%` }}
      />
    </div>
  )}
  </div>
  );
};

export default AudioPlayer; 