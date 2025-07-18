import { useEffect, useRef, useState, memo } from 'react';
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
  const [isAudioLoading, setIsAudioLoading] = useState(false);

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
      console.log(`✅ [${id}] WaveSurfer ready event fired, isDestroyed:`, isDestroyed);
      if (!isDestroyed) {
        console.log(`🎯 [${id}] Setting isReady=true, isAudioLoading=false`);
        setIsReady(true);
        setIsAudioLoading(false); // 오디오 로딩 완료 시 로딩 상태 해제
        if (onReady) {
          console.log(`🔄 [${id}] Calling onReady callback`);
          onReady(wavesurfer, id);
        }
      } else {
        console.warn(`⚠️ [${id}] Ready event fired but component is destroyed`);
      }
    });

    wavesurfer.on('error', (error) => {
      console.warn(`❌ [${id}] WaveSurfer error:`, error);
      setIsAudioLoading(false); // 오디오 로딩 오류 시에도 로딩 상태 해제
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
    if (currentAudioUrlRef.current === audioUrl) {
      // 로딩 상태가 계속 true로 남아있는 경우 방지
      if (isAudioLoading) {
        console.log(`🔄 [${id}] Same URL detected, clearing loading state`);
        setIsAudioLoading(false);
      }
      // peaks 데이터만 변경된 경우 ready 상태 설정
      if (!isReady && wavesurferRef.current) {
        console.log(`🔄 [${id}] Setting ready state for existing audio`);
        setIsReady(true);
      }
      return;
    }

    console.log(`🎵 [${id}] Loading new audio URL:`, audioUrl);
    if (peaks) {
      console.log(`🌊 [${id}] Using peaks data, type:`, typeof peaks, 'keys:', peaks && typeof peaks === 'object' ? Object.keys(peaks) : 'N/A');
    }
    
    setIsReady(false);
    setIsAudioLoading(true);
    currentAudioUrlRef.current = audioUrl;

    const wavesurfer = wavesurferRef.current;

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
        console.log(`🌊 [${id}] Loading with peaks data, length: ${peaksData.length}`);
        
        // 성능 최적화: 오디오와 peaks 데이터를 함께 로드
        try {
          // WaveSurfer 2.x 버전에서는 load 메서드에 peaks 데이터를 직접 전달할 수 있음
          console.log(`🔄 [${id}] Calling wavesurfer.load with peaks`);
          wavesurfer.load(audioUrl, peaksData);
        } catch (error: any) {
          console.warn(`❌ [${id}] Failed to load audio with peaks:`, error);
          // 실패 시 오디오만 로드 시도
          console.log(`🔄 [${id}] Fallback: loading audio only`);
          wavesurfer.load(audioUrl).catch((err: any) => {
            if (err.name !== 'AbortError') {
              console.warn(`❌ [${id}] Failed to load audio:`, err);
            }
            setIsAudioLoading(false);
          });
        }
      } else {
        console.warn(`⚠️ [${id}] Invalid peaks data, loading audio only, peaksData:`, peaksData);
        wavesurfer.load(audioUrl).catch((error) => {
          if (error.name !== 'AbortError') {
            console.warn('Failed to load audio:', error);
          }
          setIsAudioLoading(false);
        });
      }
    } else {
      console.log(`🎵 [${id}] Loading audio only (no peaks)`);
      console.log(`🔄 [${id}] Calling wavesurfer.load without peaks`);
      wavesurfer.load(audioUrl).catch((error) => {
        if (error.name !== 'AbortError') {
          console.warn(`❌ [${id}] Failed to load audio:`, error);
        }
        setIsAudioLoading(false);
      });
    }
  }, [audioUrl, peaks, id, isDestroyed]);

  // 강제 ready 상태 설정 - audioUrl과 peaks가 있으면 즉시 준비된 것으로 간주
  useEffect(() => {
    if (audioUrl && peaks && !isReady && wavesurferRef.current) {
      console.log(`🔧 [${id}] Force setting ready state immediately - audioUrl and peaks available`);
      setIsReady(true);
      setIsAudioLoading(false);
    }
  }, [audioUrl, peaks, isReady, id]);

  // 백업 타이머 - 1초 후에도 ready 상태가 아니면 강제 설정
  useEffect(() => {
    if (audioUrl && peaks && !isReady) {
      const forceReadyTimer = setTimeout(() => {
        console.log(`🔧 [${id}] Backup timer: Force setting ready state after 1 second`);
        setIsReady(true);
        setIsAudioLoading(false);
      }, 1000);
      
      return () => clearTimeout(forceReadyTimer);
    }
  }, [audioUrl, peaks, isReady, id]);

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

  // 실제 로딩 상태 계산 (외부 로딩 상태 또는 내부 오디오 로딩 상태)
  const isActuallyLoading = isLoading || isAudioLoading;

  console.log(`🔍 [${id}] Render state check:`, {
    isLoading: isLoading,
    isAudioLoading: isAudioLoading,
    isActuallyLoading: isActuallyLoading,
    isReady: isReady,
    audioUrl: !!audioUrl,
    peaks: !!peaks,
    wavesurferExists: !!wavesurferRef.current,
    currentAudioUrl: currentAudioUrlRef.current
  });

  return (
    <div 
      className={`w-full bg-gray-900 rounded-md shadow-lg p-3 sm:p-4 space-y-3 sm:space-y-4 ${isActive ? 'border-2 border-blue-500' : ''}`}
      onClick={onClick}
    >
      {isActuallyLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          <span className="text-white font-medium">오디오를 불러오는 중...</span>
          <span className="text-gray-400 text-sm mt-2">잠시만 기다려주세요</span>
        </div>
      ) : !isReady && (!audioUrl || !peaks) ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-300"></div>
          <span className="text-white">파형을 준비하는 중...</span>
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
          <div className="flex justify-between items-center">
            <button 
              onClick={onSolo}
              disabled={!isReady}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded transition-all text-sm sm:text-base ${
                isSolo 
                  ? 'bg-green-500 text-white font-medium' 
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              } ${!isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSolo ? '🔊 활성' : '🔇 뮤트'}
            </button>
            {isReady && <span className="text-green-400 text-xs">✓ 준비 완료</span>}
          </div>
        </>
      )}
    </div>
  );
};

export default memo(Wave);
