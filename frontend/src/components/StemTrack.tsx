
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
    <div className={`flex items-center p-3 rounded-lg mb-1 transition-all duration-200 ${
      type === 'master' 
        ? 'bg-green-900/30 border-l-4 border-green-500' 
        : 'bg-blue-900/30 border-l-4 border-blue-500'
    } ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      {/* Track Type & Name */}
      <div className="w-32 mr-4">
        <div className="flex items-center space-x-2">
          <span className={`text-xs font-bold px-2 py-1 rounded ${
            type === 'master' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
          }`}>
            {type.toUpperCase()}
          </span>
        </div>
        <p className="font-semibold text-sm mt-1 text-gray-200">{name}</p>
      </div>
      
      {/* Waveform */}
      <div className="flex-grow mr-4 h-16 relative" ref={waveformRef}>
        {/* Fallback waveform image if wavesurfer fails */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded">
          <span className="text-xs text-gray-400">Waveform loading...</span>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center space-x-3">
        {/* Play/Pause Button */}
        <button 
          onClick={() => onPlay(id)} 
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            isPlaying 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
        >
          <span className="text-sm">
            {isPlaying ? '⏸' : '▶'}
          </span>
        </button>
        
        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">VOL</span>
          <div className="relative w-16">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(id, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <span className="text-xs text-gray-400 w-8">
            {Math.round(volume * 100)}%
          </span>
        </div>
        
        {/* Mute Button */}
        <button 
          onClick={() => onMute(id)} 
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            isMuted 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
        >
          <span className="text-sm">
            {isMuted ? '🔇' : '🔊'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default StemTrack;
