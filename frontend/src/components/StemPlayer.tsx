import React, { useState, useEffect,  } from 'react';
import { Play, Pause, Square, Volume2, VolumeX } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import { StemStreamingInfo } from '../services/streamingService';

interface StemPlayerProps {
  stems: StemStreamingInfo[];
  className?: string;
}

interface StemState {
  volume: number;
  muted: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

const StemPlayer: React.FC<StemPlayerProps> = ({ stems, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [stemStates, setStemStates] = useState<Record<string, StemState>>({});
  const [masterVolume, setMasterVolume] = useState(1);
  const [masterMuted, setMasterMuted] = useState(false);


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

  // 마스터 재생/일시정지
  const handleMasterPlayPause = () => {
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
    }
  
    setIsPlaying(willPlay);
  };

  // 마스터 정지
  const handleMasterStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
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

  // 시간 업데이트
  const handleTimeUpdate = (stemId: string, time: number) => {
    setStemStates(prev => ({
      ...prev,
      [stemId]: {
        ...prev[stemId],
        currentTime: time
      }
    }));
  };

  // 시간 표시 포맷
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 최대 재생 시간 계산
  const maxDuration = Math.max(...Object.values(stemStates).map(state => state.duration || 0));

  // 프로그레스 바 클릭 핸들러
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const barWidth = rect.width;
    const newTime = (clickX / barWidth) * maxDuration;
    setCurrentTime(newTime);
  };

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
            className="flex items-center justify-center w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
          >
            {isPlaying ? (
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
        />
        ))}
      </div>
    </div>
  );
};

export default StemPlayer; 