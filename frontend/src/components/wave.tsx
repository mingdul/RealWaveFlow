import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';

export interface WaveProps {
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
  peaks?: any; // waveform JSON 데이터
  isLoading?: boolean; // 로딩 상태 추가
}

const Wave = ({ 
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
  peaks,
  onSeek,
  isLoading = false
}: WaveProps) => {
  const waveRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const currentAudioUrlRef = useRef<string>('');

  // WaveSurfer 인스턴스 생성 (한 번만)
  useEffect(() => {
    if (!waveRef.current || !timelineRef.current || !minimapRef.current) return;

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
  }, [waveColor, onReady, id]); // audioUrl 의존성 제거

  // 오디오 URL 또는 peaks 변경 시 로드만 다시 실행
  useEffect(() => {
    if (!wavesurferRef.current || !audioUrl || isDestroyed) return;
    
    // 이미 같은 URL이 로드되어 있으면 스킵
    if (currentAudioUrlRef.current === audioUrl) return;

    console.log(`🎵 Loading new audio URL for ${id}:`, audioUrl);
    if (peaks) {
      console.log(`🌊 Using peaks data for ${id}:`, peaks);
    }
    
    setIsReady(false);
    currentAudioUrlRef.current = audioUrl;

    // peaks 데이터가 있으면 함께 로드, 없으면 오디오만 로드
    if (peaks) {
      // peaks 데이터 형태 확인 및 처리
      let peaksData = peaks;
      
      // 객체 형태인 경우 peaks 배열 추출
      if (peaks && typeof peaks === 'object' && !Array.isArray(peaks)) {
        if (peaks.peaks && Array.isArray(peaks.peaks)) {
          // {peaks: [...], duration: ..., sample_rate: ...} 형태
          peaksData = peaks.peaks;
        } else if (peaks.data && Array.isArray(peaks.data)) {
          // {data: [...]} 형태
          peaksData = peaks.data;
        }
      } else if (Array.isArray(peaks)) {
        // 이미 배열 형태인 경우
        peaksData = peaks;
      }
      
      // WaveSurfer가 기대하는 형식으로 변환
      // peaks 배열이 유효한지 확인
      if (Array.isArray(peaksData) && peaksData.length > 0) {
        console.log(`🌊 Loading with peaks data for ${id}:`, peaksData);
        console.log(`🌊 Peaks data type:`, typeof peaksData);
        console.log(`🌊 Peaks data length:`, peaksData.length);
        console.log(`🌊 First few peaks:`, peaksData.slice(0, 5));
        
        const wavesurfer = wavesurferRef.current;
        
        // WaveSurfer의 load 메소드에 peaks 데이터를 전달하지 않고 오디오만 로드
        // peaks 데이터는 나중에 별도로 처리
        wavesurfer.load(audioUrl).catch((error) => {
          if (error.name !== 'AbortError') {
            console.warn('Failed to load audio:', error);
          }
        });
      } else {
        console.warn('Invalid peaks data, loading audio only');
        const wavesurfer = wavesurferRef.current;
        wavesurfer.load(audioUrl).catch((error) => {
          if (error.name !== 'AbortError') {
            console.warn('Failed to load audio:', error);
          }
        });
      }
    } else {
      console.log(`🎵 Loading audio only for ${id}`);
      const wavesurfer = wavesurferRef.current;
      wavesurfer.load(audioUrl).catch((error) => {
        if (error.name !== 'AbortError') {
          console.warn('Failed to load audio:', error);
        }
      });
    }
  }, [audioUrl, peaks, id, isDestroyed]);

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
      className={`w-full bg-gray-900 rounded-md shadow-lg p-3 sm:p-4 space-y-3 sm:space-y-4 ${isActive ? 'border-2 border-blue-500' : ''}`}
      onClick={onClick}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="mr-3 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <span className="text-white">오디오를 불러오는 중...</span>
        </div>
      ) : (
        <>
          <div className="relative border border-gray-700 rounded overflow-hidden">
            <div id="wave-minimap" ref={minimapRef} className="h-12 sm:h-14 md:h-16" />
          </div>
          <div className="relative border border-gray-700 rounded overflow-hidden">
            <div id="wave-timeline" ref={timelineRef} className="h-8 sm:h-9 md:h-10" />
            <div id="wave-presentation" ref={waveRef} className="h-48 sm:h-56 md:h-64 lg:h-72" />
          </div>
          <button 
            onClick={onSolo}
            disabled={!isReady}
            className={`px-3 py-2 sm:px-4 sm:py-2 rounded transition-all text-sm sm:text-base ${
              isSolo 
                ? 'bg-purple-500 text-black' 
                : 'bg-gray-700 text-white hover:bg-gray-600'
            } ${!isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Solo
          </button>
        </>
      )}
    </div>
  );
};

export default Wave;
