
import React, { useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';

// Custom styles for the slider
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #3B82F6;
    border-radius: 50%;
    cursor: pointer;
  }
  
  .slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #3B82F6;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
`;

interface StemTrackProps {
  id: number;
  name: string;
  url: string;
  type: 'master' | 'update';
  waveformSrc: string;
  duration: number;
  isActive: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  onPlay: (id: number) => void;
  onVolumeChange: (id: number, volume: number) => void;
  onMute: (id: number) => void;
  onReady: (duration: number) => void;
  seekTime: number | null;
}

const StemTrack: React.FC<StemTrackProps> = ({ id, name, url, type, isActive, isPlaying, isMuted, volume, onPlay, onVolumeChange, onMute, onReady, seekTime }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  // Add custom styles (only once)
  useEffect(() => {
    const styleId = 'slider-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.innerHTML = sliderStyles;
      document.head.appendChild(styleSheet);
    }
  }, []);

  useEffect(() => {
    if (waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: type === 'master' ? '#A8DBA8' : '#3B82F6',
        progressColor: type === 'master' ? '#3B82F6' : '#A8DBA8',
        height: 64,
        barWidth: 2,
        cursorWidth: 0,

      });

      wavesurfer.current.load(url);

      wavesurfer.current.on('ready', () => {
        if (wavesurfer.current) {
          onReady(wavesurfer.current.getDuration());
        }
      });

      return () => {
        wavesurfer.current?.destroy();
      };
    }
  }, [url, type, onReady]);

  useEffect(() => {
    if (wavesurfer.current) {
      if (isPlaying) {
        wavesurfer.current.play();
      } else {
        wavesurfer.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(isMuted ? 0 : volume);
    }
  }, [isMuted, volume]);

  useEffect(() => {
    if (seekTime !== null && wavesurfer.current) {
        const duration = wavesurfer.current.getDuration();
        if(duration > 0) {
            wavesurfer.current.seekTo(seekTime / duration);
        }
    }
  }, [seekTime]);

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center p-2 sm:p-3 rounded-lg mb-1 transition-all duration-200 ${
      type === 'master' 
        ? 'bg-green-900/30 border-l-4 border-green-500' 
        : 'bg-blue-900/30 border-l-4 border-blue-500'
    } ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      {/* Track Type & Name */}
      <div className="w-full sm:w-24 md:w-28 lg:w-32 mb-2 sm:mb-0 sm:mr-3 md:mr-4">
        <div className="flex items-center space-x-2">
          <span className={`text-xs font-bold px-2 py-1 rounded ${
            type === 'master' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
          }`}>
            {type.toUpperCase()}
          </span>
        </div>
        <p className="font-semibold text-xs sm:text-sm mt-1 text-gray-200 truncate">{name}</p>
      </div>
      
      {/* Waveform */}
      <div className="flex-grow w-full sm:mr-3 md:mr-4 h-12 sm:h-14 md:h-16 relative" ref={waveformRef}>
        {/* Fallback waveform image if wavesurfer fails */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded">
          <span className="text-xs text-gray-400">Waveform loading...</span>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex flex-row sm:flex-col lg:flex-row items-center justify-between sm:justify-center lg:justify-between w-full sm:w-auto gap-2 sm:gap-1 lg:gap-2 mt-2 sm:mt-0">
        {/* Play Button */}
        <button
          onClick={() => onPlay(id)}
          className="flex items-center justify-center w-8 h-8 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors flex-shrink-0"
        >
          <span className="text-white text-xs sm:text-xs md:text-sm">
            {isPlaying ? '⏸' : '▶'}
          </span>
        </button>

        {/* Mute Button */}
        <button
          onClick={() => onMute(id)}
          className={`flex items-center justify-center w-8 h-8 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full transition-colors flex-shrink-0 ${
            isMuted 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          <span className="text-white text-xs sm:text-xs md:text-sm">
            {isMuted ? '🔇' : '🔊'}
          </span>
        </button>

        {/* Volume Slider */}
        <div className="volume-control flex-grow sm:flex-grow-0 sm:w-16 md:w-20 lg:w-24">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(id, parseFloat(e.target.value))}
              className="volume-slider w-full h-1 sm:h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(isMuted ? 0 : volume) * 100}%, #374151 ${(isMuted ? 0 : volume) * 100}%, #374151 100%)`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StemTrack;
