import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, VolumeX } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import { StemStreamingInfo } from '../services/streamingService';
import streamingService from '../services/streamingService';

interface StemPlayerProps {
  stems: StemStreamingInfo[];
  className?: string;
  stageId?: string; // Optional stageId for guide playback
  guideUrl?: string;
}

interface StemState {
  volume: number;
  muted: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

const StemPlayer: React.FC<StemPlayerProps> = ({ stems, className = '', stageId}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [stemStates, setStemStates] = useState<Record<string, StemState>>({});
  const [masterVolume, setMasterVolume] = useState(1);
  const [masterMuted, setMasterMuted] = useState(false);

  // Guide audio states
  const [guideUrl, setGuideUrl] = useState<string | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const guideAudioRef = useRef<HTMLAudioElement>(null);

  // Refs for accessing AudioPlayer components
  const stemRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // 스템 상태 초기화
  useEffect(() => {
    const initialStates: Record<string, StemState> = {};
    stems.forEach(stem => {
      initialStates[stem.id] = {
        volume: 1,
        muted: false,
        currentTime: 0,
        duration: 0,
        isPlaying: false
      };
    });
    setStemStates(initialStates);
  }, [stems]);

  // 가이드 오디오 시간 업데이트 핸들러
  useEffect(() => {
    const guideAudio = guideAudioRef.current;
    if (!guideAudio) return;

    const handleTimeUpdate = () => {
      if (isPlaying) {
        setCurrentTime(guideAudio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      console.log('Guide audio duration:', guideAudio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setGuideUrl(null);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error('Guide audio playback error:', e);
      setIsPlaying(false);
      setGuideUrl(null);
    };

    guideAudio.addEventListener('timeupdate', handleTimeUpdate);
    guideAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
    guideAudio.addEventListener('ended', handleEnded);
    guideAudio.addEventListener('error', handleError);

    return () => {
      guideAudio.removeEventListener('timeupdate', handleTimeUpdate);
      guideAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      guideAudio.removeEventListener('ended', handleEnded);
      guideAudio.removeEventListener('error', handleError);
    };
  }, [guideUrl, isPlaying]);

  // currentTime 변경 시 모든 스템들 동기화
  useEffect(() => {
    // 마스터가 재생 중이 아닐 때만 동기화 (재생 중에는 가이드가 시간을 주도)
    if (!isPlaying) {
      stems.forEach(stem => {
        const stemAudio = stemRefs.current[stem.id];
        if (stemAudio && Math.abs(stemAudio.currentTime - currentTime) > 0.1) {
          stemAudio.currentTime = currentTime;
        }
      });
    }
  }, [currentTime, stems, isPlaying]);

  // 마스터 재생/일시정지
  const handleMasterPlayPause = async () => {
    const willPlay = !isPlaying;
  
    if (willPlay) {
      // 어떤 스템이라도 재생 중이면 모두 정지
      const anyStemPlaying = Object.values(stemStates).some(stem => stem.isPlaying);
      if (anyStemPlaying) {
        setStemStates(prev => {
          const updatedStates: Record<string, StemState> = {};
          Object.keys(prev).forEach(id => {
            updatedStates[id] = {
              ...prev[id],
              isPlaying: false,
            };
          });
          return updatedStates;
        });
      }

      // If stageId is provided, fetch and play guide file
      if (stageId) {
        try {
          setGuideLoading(true);
          const response = await streamingService.getGuidePresignedUrlByStageId(stageId);
          
          console.log('Guide API response:', response);
          console.log('Response success:', response.success);
          console.log('Response data:', response.data);
          
          if (response.success && response.data) {
            setGuideUrl(response.data.presignedUrl);
            // console.log('Guide file loaded:', response.data.);
          } else {
            console.error('Failed to fetch guide - success:', response.success);
            console.error('Failed to fetch guide - message:', response.message);
            console.error('Failed to fetch guide - full response:', response);
          }
        } catch (error) {
          console.error('Error fetching guide:', error);
        } finally {
          setGuideLoading(false);
        }
      }

      // 마스터 재생 시 모든 스템들을 현재 시간으로 동기화
      // setTimeout을 사용하여 가이드 오디오 로드 완료 후 동기화
      const syncStemsWithCurrentTime = () => {
        stems.forEach(stem => {
          const stemAudio = stemRefs.current[stem.id];
          if (stemAudio) {
            stemAudio.currentTime = currentTime;
          }
        });
      };

      // 가이드가 있는 경우 가이드 오디오 로드 후 동기화
      if (stageId && guideAudioRef.current) {
        const handleCanPlay = () => {
          syncStemsWithCurrentTime();
          guideAudioRef.current?.removeEventListener('canplay', handleCanPlay);
        };
        guideAudioRef.current.addEventListener('canplay', handleCanPlay);
        
        // 이미 로드되어 있는 경우를 위한 fallback
        if (guideAudioRef.current.readyState >= 3) {
          syncStemsWithCurrentTime();
        }
      } else {
        // 가이드가 없는 경우 즉시 동기화
        syncStemsWithCurrentTime();
      }
    } else {
      // Stop guide playback when pausing
      if (guideAudioRef.current) {
        guideAudioRef.current.pause();
      }
      if (!stageId) {
        setGuideUrl(null);
        setCurrentTime(0);
      }
    }
  
    setIsPlaying(willPlay);
  };

  // 마스터 정지
  const handleMasterStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Reset guide audio
    if (guideAudioRef.current) {
      guideAudioRef.current.pause();
      guideAudioRef.current.currentTime = 0;
    }
    
    // Reset all stem audio
    stems.forEach(stem => {
      const stemAudio = stemRefs.current[stem.id];
      if (stemAudio) {
        stemAudio.currentTime = 0;
      }
    });
    
    setGuideUrl(null);
  };

  // 마스터 볼륨 변경
  const handleMasterVolumeChange = (volume: number) => {
    setMasterVolume(volume);
  };

  // 마스터 뮤트 토글
  const handleMasterMuteToggle = () => {
    setMasterMuted(!masterMuted);
  };

  // 개별 스템 재생/일시정지
  const handleStemPlayPause = (stemId: string) => {

    if(isPlaying){
      setIsPlaying(false);
    }

    setStemStates(prev => {
      const updatedStemStates : Record<string, StemState> = {};

      Object.keys(prev).forEach(id => {
        updatedStemStates[id] = {
          ...prev[id],
          isPlaying: id == stemId ? !prev[id].isPlaying : false,
        };
      });

      return updatedStemStates;
    });
  };

  // 개별 스템 볼륨 변경
  const handleStemVolumeChange = (stemId: string, volume: number) => {
    setStemStates(prev => ({
      ...prev,
      [stemId]: {
        ...prev[stemId],
        volume
      }
    }));
  };

  // 개별 스템 뮤트 토글
  const handleStemMuteToggle = (stemId: string) => {
    setStemStates(prev => ({
      ...prev,
      [stemId]: {
        ...prev[stemId],
        muted: !prev[stemId]?.muted
      }
    }));
  };

  // 스템 메타데이터 로드
  const handleStemLoadedMetadata = (stemId: string, duration: number) => {
    setStemStates(prev => ({
      ...prev,
      [stemId]: {
        ...prev[stemId],
        duration
      }
    }));
  };

  // 시간 업데이트 - 개별 스템이 재생 중일 때만 마스터 시간 업데이트
  const handleTimeUpdate = (stemId: string, time: number) => {
    setStemStates(prev => ({
      ...prev,
      [stemId]: {
        ...prev[stemId],
        currentTime: time
      }
    }));

    // 해당 스템이 재생 중일 때만 마스터 시간 업데이트
    if (stemStates[stemId]?.isPlaying && !isPlaying) {
      setCurrentTime(time);
    }
  };

  // 시간 표시 포맷
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 최대 재생 시간 계산
  const maxDuration = Math.max(...Object.values(stemStates).map(state => state.duration || 0));

  // 프로그레스 바 클릭 핸들러 - 실제 오디오 시간 변경
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const barWidth = rect.width;
    const newTime = (clickX / barWidth) * maxDuration;
    
    setCurrentTime(newTime);

    // 가이드 오디오 시간 변경
    if (guideAudioRef.current && guideUrl) {
      guideAudioRef.current.currentTime = newTime;
    }

    // 모든 스템 오디오 시간 변경
    stems.forEach(stem => {
      const stemAudio = stemRefs.current[stem.id];
      if (stemAudio) {
        stemAudio.currentTime = newTime;
      }
    });
  };

  // Handle guide audio playback and volume
  useEffect(() => {
    const guideAudio = guideAudioRef.current;
    if (!guideAudio) return;

    // Set volume
    guideAudio.volume = masterMuted ? 0 : masterVolume;

    // Handle playback
    if (guideUrl) {
      if (isPlaying) {
        guideAudio.play().catch(console.error);
      } else {
        guideAudio.pause();
      }
    }
  }, [isPlaying, guideUrl, masterVolume, masterMuted]);

  if (stems.length === 0) {
    return (
      <div className={`p-6 bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center text-gray-400">
          <p>스템 파일이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-gray-900 rounded-lg ${className}`}>
      {/* 마스터 컨트롤 */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">마스터 컨트롤</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMasterMuteToggle}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {masterMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={masterMuted ? 0 : masterVolume}
              onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
              className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(masterMuted ? 0 : masterVolume) * 100}%, #4b5563 ${(masterMuted ? 0 : masterVolume) * 100}%, #4b5563 100%)`
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleMasterPlayPause}
            disabled={guideLoading}
            className="flex items-center justify-center w-12 h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-full transition-colors"
          >
            {guideLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={20} className="text-white" />
            ) : (
              <Play size={20} className="text-white ml-0.5" />
            )}
          </button>
          <button
            onClick={handleMasterStop}
            className="flex items-center justify-center w-12 h-12 bg-gray-600 hover:bg-gray-700 rounded-full transition-colors"
          >
            <Square size={20} className="text-white" />
          </button>
          <div className="text-sm text-gray-400">
            {formatTime(currentTime)} / {formatTime(maxDuration)}
          </div>
          {stageId && (
            <div className="text-xs text-purple-400 ml-2">
              {guideLoading ? '가이드 로딩 중...' : '가이드 재생'}
            </div>
          )}
        </div>

        {/* 프로그레스 바 */}
        <div
          className="w-full h-2 bg-gray-700 rounded-full cursor-pointer"
          onClick={handleProgressBarClick}
        >
          <div
            className="h-full bg-purple-600 rounded-full transition-all duration-100"
            style={{
              width: `${maxDuration > 0 ? (currentTime / maxDuration) * 100 : 0}%`
            }}
          />
        </div>
      </div>

      {/* 스템 리스트 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white mb-3">스템 트랙</h3>
        {stems.map((stem) => (
          <AudioPlayer
            key={stem.id}
            src={stem.presignedUrl}
            fileName={stem.fileName}
            isPlaying={stemStates[stem.id]?.isPlaying || false}
            onPlayPause={() => handleStemPlayPause(stem.id)}
            currentTime={stemStates[stem.id]?.currentTime || 0}
            volume={(stemStates[stem.id]?.volume || 1) * masterVolume}
            onVolumeChange={(volume) => handleStemVolumeChange(stem.id, volume)}
            muted={stemStates[stem.id]?.muted || masterMuted}
            onMuteToggle={() => handleStemMuteToggle(stem.id)}
            onTimeUpdate={(time) => handleTimeUpdate(stem.id, time)}
            onLoadedMetadata={(duration) => handleStemLoadedMetadata(stem.id, duration)}
            showProgressBar={stemStates[stem.id]?.isPlaying || false}
            className="bg-gray-800"
            onAudioReady={(audio) => {
              // audio element를 stemRefs에 저장
              stemRefs.current[stem.id] = audio;
            }}
            onProgressBarClick={(newTime) => {
              // 개별 스템의 프로그레스 바 클릭 시 해당 스템만 시간 변경
              const stemAudio = stemRefs.current[stem.id];
              if (stemAudio) {
                stemAudio.currentTime = newTime;
              }
            }}
          />
        ))}
      </div>

      {/* Hidden Guide Audio Element */}
      {guideUrl && (
        <audio
          ref={guideAudioRef}
          src={guideUrl}
          onEnded={() => {
            setIsPlaying(false);
            setGuideUrl(null);
          }}
          onError={(e) => {
            console.error('Guide audio playback error:', e);
            setIsPlaying(false);
            setGuideUrl(null);
          }}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

export default StemPlayer; 