import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

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
  showProgressBar = false
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        className="flex items-center justify-center w-10 h-10 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-full transition-colors"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause size={16} className="text-white" />
        ) : (
          <Play size={16} className="text-white ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate mb-1">
          {fileName}
        </div>
        <div className="text-xs text-gray-400">
          {loading ? 'Loading...' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onMuteToggle}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
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
    <div className="w-full h-1 bg-gray-700 rounded overflow-hidden mt-1">
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