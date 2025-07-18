import { useEffect, useRef, useState, memo, useCallback } from 'react';
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

const Wave = memo(({ 
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
  const initializationRef = useRef<boolean>(false);
  const readyCallbackCalledRef = useRef<boolean>(false);

  // Memoized ready handler to prevent recreation
  const handleReadyCallback = useCallback(() => {
    if (!wavesurferRef.current || isDestroyed || readyCallbackCalledRef.current) return;
    
    console.log(`✅ [${id}] WaveSurfer ready event fired, calling onReady`);
    setIsReady(true);
    setIsAudioLoading(false);
    readyCallbackCalledRef.current = true;
    
    if (onReady) {
      onReady(wavesurferRef.current, id);
    }
  }, [onReady, id, isDestroyed]);

  // WaveSurfer 인스턴스 생성 (한 번만)
  useEffect(() => {
    if (!waveRef.current || !timelineRef.current || !minimapRef.current || initializationRef.current) return;

    initializationRef.current = true;
    setIsDestroyed(false);
    readyCallbackCalledRef.current = false;

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

    wavesurfer.on('ready', handleReadyCallback);

    wavesurfer.on('error', (error) => {
      console.warn(`❌ [${id}] WaveSurfer error:`, error);
      setIsAudioLoading(false);
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
      initializationRef.current = false;
      setIsDestroyed(true);
      setIsReady(false);
      readyCallbackCalledRef.current = false;
      if (wavesurfer) {
        try {
          wavesurfer.destroy();
        } catch (error) {
          console.warn('Error destroying wavesurfer:', error);
        }
      }
    };
  }, [waveColor, handleReadyCallback, id, onSeek]);

  // 오디오 URL 또는 peaks 변경 시 로드만 다시 실행
  useEffect(() => {
    if (!wavesurferRef.current || !audioUrl || isDestroyed || !initializationRef.current) return;
    
    // 이미 같은 URL이 로드되어 있으면 스킵
    if (currentAudioUrlRef.current === audioUrl && isReady) {
      console.log(`🔄 [${id}] Same URL detected and already ready, skipping reload`);
      return;
    }

    console.log(`🎵 [${id}] Loading audio URL:`, audioUrl);
    
    // 새로운 오디오 로드 시에만 ready 상태 리셋
    if (currentAudioUrlRef.current !== audioUrl) {
      setIsReady(false);
      setIsAudioLoading(true);
      readyCallbackCalledRef.current = false;
      currentAudioUrlRef.current = audioUrl;
    }

    const wavesurfer = wavesurferRef.current;

    // peaks 데이터가 있으면 함께 로드, 없으면 오디오만 로드
    if (peaks) {
      // peaks 데이터 형태 확인 및 처리
      let peaksData = peaks;
      
      // 객체 형태인 경우 peaks 배열 추출
      if (peaks && typeof peaks === 'object' && !Array.isArray(peaks)) {
        if (peaks.peaks && Array.isArray(peaks.peaks)) {
          peaksData = peaks.peaks;
        } else if (peaks.data && Array.isArray(peaks.data)) {
          peaksData = peaks.data;
        }
      } else if (Array.isArray(peaks)) {
        peaksData = peaks;
      }
      
      // WaveSurfer가 기대하는 형식으로 변환
      if (Array.isArray(peaksData) && peaksData.length > 0) {
        console.log(`🌊 [${id}] Loading with peaks data, length: ${peaksData.length}`);
        
        try {
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
        console.warn(`⚠️ [${id}] Invalid peaks data, loading audio only`);
        wavesurfer.load(audioUrl).catch((error) => {
          if (error.name !== 'AbortError') {
            console.warn('Failed to load audio:', error);
          }
          setIsAudioLoading(false);
        });
      }
    } else {
      console.log(`🎵 [${id}] Loading audio only (no peaks)`);
      wavesurfer.load(audioUrl).catch((error) => {
        if (error.name !== 'AbortError') {
          console.warn(`❌ [${id}] Failed to load audio:`, error);
        }
        setIsAudioLoading(false);
      });
    }
  }, [audioUrl, peaks, id, isDestroyed, isReady]);

  // 재생/일시정지 제어 (AbortError 방지)
  useEffect(() => {
    if (!wavesurferRef.current || !isReady || isDestroyed) return;

    const wavesurfer = wavesurferRef.current;
    
    try {
      if (isPlaying) {
        // 이미 재생 중인지 확인
        if (!wavesurfer.isPlaying()) {
          wavesurfer.play().catch((error: any) => {
            // AbortError는 정상적인 동작이므로 무시
            if (error.name !== 'AbortError') {
              console.warn(`❌ [${id}] Play error:`, error);
            }
          });
        }
      } else {
        // 재생 중인지 확인 후 일시정지
        if (wavesurfer.isPlaying()) {
          wavesurfer.pause();
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.warn(`❌ [${id}] Playback control error:`, error);
      }
    }
  }, [isPlaying, isReady, isDestroyed, id]);

  // 시간 동기화 (seeking 시에만 실행되도록 최적화)
  useEffect(() => {
    if (!wavesurferRef.current || !isReady || isDestroyed) return;

    const wavesurfer = wavesurferRef.current;
    const duration = wavesurfer.getDuration();
    
    if (duration > 0) {
      const currentWaveTime = wavesurfer.getCurrentTime();
      const timeDiff = Math.abs(currentWaveTime - currentTime);
      
      // 시간 차이가 0.1초 이상일 때만 seek (불필요한 seek 방지)
      if (timeDiff > 0.1) {
        try {
          wavesurfer.seekTo(currentTime / duration);
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.warn(`❌ [${id}] Seek error:`, error);
          }
        }
      }
    }
  }, [currentTime, isReady, isDestroyed, id]);

  // 실제 로딩 상태 계산
  const isActuallyLoading = isLoading || isAudioLoading;

  // 렌더링 로그 최소화
  const shouldLog = useRef(true);
  if (shouldLog.current) {
    console.log(`🔍 [${id}] Render state:`, {
      isReady,
      isActuallyLoading,
      hasAudio: !!audioUrl,
      hasPeaks: !!peaks
    });
    shouldLog.current = false;
    // 1초 후 다시 로깅 허용
    setTimeout(() => { shouldLog.current = true; }, 1000);
  }

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
      ) : !isReady ? (
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
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all duration-200 text-sm sm:text-base font-medium ${
                isSolo 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 border border-green-400 ring-2 ring-green-300/50' 
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600 hover:border-gray-500'
              } ${!isReady ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'}`}
            >
              <span className="flex items-center gap-1">
                {isSolo ? (
                  <>
                    <span className="animate-pulse">🎵</span>
                    <span>SOLO</span>
                  </>
                ) : (
                  <>
                    <span>🔇</span>
                    <span>뮤트</span>
                  </>
                )}
              </span>
            </button>
            {isReady && <span className="text-green-400 text-xs">✓ 준비 완료</span>}
          </div>
        </>
      )}
    </div>
  );
});

// 디스플레이 이름 설정
Wave.displayName = 'Wave';

export default Wave;
