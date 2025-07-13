import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';

export interface WaveformClonerProps {
  audioUrl: string;
  waveColor?: string;
  onReady?: (ws: WaveSurfer, id: string) => void;
  onClick?: () => void;
  isActive?: boolean;
  id: string;
  isPlaying: boolean;
  currentTime: number;
  onSolo: () => void;
  isSolo: boolean;
  onSeek?: (time: number, trackId: string) => void;
}

const WaveformCloner = ({ 
  onReady, 
  audioUrl, 
  waveColor, 
  onClick, 
  isActive, 
  id, 
  isPlaying, 
  currentTime, 
  onSolo,
  isSolo,
  onSeek
}: WaveformClonerProps) => {
  const waveRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);

  useEffect(() => {
    if (!waveRef.current || !timelineRef.current || !minimapRef.current || !audioUrl) return;

    setIsReady(false);
    setIsDestroyed(false);

    const wavesurfer = WaveSurfer.create({
      container: waveRef.current,
      waveColor: waveColor || '#666',
      progressColor: '#00ccff',
      height: 260,
      normalize: true,
      plugins: [
        TimelinePlugin.create({ container: timelineRef.current }),
        MinimapPlugin.create({
          container: minimapRef.current,
          waveColor: '#555',
          progressColor: '#36f7d3',
          height: 60,
        }),
      ],
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on('ready', () => {
      if (!isDestroyed) {
        setIsReady(true);
        if (onReady) onReady(wavesurfer, id);
      }
    });

    wavesurfer.on('error', (error) => {
      console.warn('WaveSurfer error:', error);
    });

    // 사용자가 파형을 클릭하거나 드래그할 때 즉시 currentTime 업데이트
    wavesurfer.on('interaction', (newTime: number) => {
      if (onSeek) {
        onSeek(newTime, id);
      }
    });

    // seek 이벤트 (progress 기반)
    wavesurfer.on('seek' as any, (progress: number) => {
      const time = wavesurfer.getDuration() * progress;
      if (onSeek) {
        onSeek(time, id);
      }
    });

    // 오디오 로드
    wavesurfer.load(audioUrl).catch((error) => {
      if (error.name !== 'AbortError') {
        console.warn('Failed to load audio:', error);
      }
    });

    return () => {
      setIsDestroyed(true);
      setIsReady(false);
      if (wavesurfer) {
        try {
          wavesurfer.destroy();
        } catch (error) {
          console.warn('Error destroying wavesurfer:', error);
        }
      }
    };
  }, [audioUrl, waveColor, onReady, id]); // onSeek 의존성 제거

  useEffect(() => {
    if (wavesurferRef.current && isReady && !isDestroyed) {
      try {
        if (isPlaying) {
          wavesurferRef.current.play();
        } else {
          wavesurferRef.current.pause();
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.warn('Error controlling playback:', error);
        }
      }
    }
  }, [isPlaying, isReady, isDestroyed]);

  useEffect(() => {
    if (wavesurferRef.current && isReady && !isDestroyed) {
      try {
        const duration = wavesurferRef.current.getDuration();
        if (duration > 0 && Math.abs(wavesurferRef.current.getCurrentTime() - currentTime) > 0.1) {
          wavesurferRef.current.seekTo(currentTime / duration);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.warn('Error seeking:', error);
        }
      }
    }
  }, [currentTime, isReady, isDestroyed]);

  return (
    <div 
      className={`w-full bg-gray-900 rounded-md shadow-lg p-4 space-y-4 ${isActive ? 'border-2 border-blue-500' : ''}`}
      onClick={onClick}
    >
      <div className="relative border border-gray-700 rounded overflow-hidden">
        <div id="wave-minimap" ref={minimapRef} className="h-[60px]" />
      </div>
      <div className="relative border border-gray-700 rounded overflow-hidden">
        <div id="wave-timeline" ref={timelineRef} className="h-[40px]" />
        <div id="wave-presentation" ref={waveRef} className="h-[260px]" />
      </div>
      <button 
        onClick={onSolo}
        disabled={!isReady}
        className={`px-4 py-2 rounded transition-all ${
          isSolo 
            ? 'bg-yellow-500 text-black' 
            : 'bg-gray-700 text-white hover:bg-gray-600'
        } ${!isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Solo
      </button>
    </div>
  );
};

export default WaveformCloner;
