import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Download } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import { StemStreamingInfo } from '../services/streamingService';
import streamingService from '../services/streamingService';
import { getStageDetail } from '../services/stageService';
import { saveAs } from 'file-saver';

interface StemPlayerProps {
  stems: StemStreamingInfo[];
  className?: string;
  stageId?: string; // Optional stageId for guide playback
  guideUrl?: string;
  onShowStage?: (stageId: string) => void;
}

interface StemState {
  volume: number;
  muted: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

const StemPlayer: React.FC<StemPlayerProps> = ({ stems, className = '', stageId, onShowStage}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [stemStates, setStemStates] = useState<Record<string, StemState>>({});
  const [masterVolume, setMasterVolume] = useState(1);
  const [masterMuted, setMasterMuted] = useState(false);
  
  // Download states
  const [selectMode, setSelectMode] = useState(false);
  const [selectedStems, setSelectedStems] = useState<Record<string, boolean>>({});

  // Guide audio states
  const [guideUrl, setGuideUrl] = useState<string | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const guideAudioRef = useRef<HTMLAudioElement>(null);

  // Stage-based stems loading
  const [stageStems, setStageStems] = useState<StemStreamingInfo[]>([]);
  const [stemsLoading, setStemsLoading] = useState(false);
  const [stageInfo, setStageInfo] = useState<any>(null);

  // Refs for accessing AudioPlayer components
  const stemRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Determine which stems to use (stage-based or prop-based)
  const activeStemsData = stageId && stageStems.length > 0 ? stageStems : stems;

  // Load stems based on stageId
  useEffect(() => {
    const loadStemsByStageId = async () => {
      if (!stageId) {
        setStageStems([]);
        setStageInfo(null);
        return;
      }

      try {
        setStemsLoading(true);
        console.log('[DEBUG] Loading stems for stageId:', stageId);

        // Get stage information
        const stageResponse = await getStageDetail(stageId);
        if (!stageResponse.success) {
          console.error('Failed to get stage detail:', stageResponse.message);
          return;
        }

        const stage = stageResponse.data;
        setStageInfo(stage);
        console.log('[DEBUG] Stage info:', stage);

        // Load stems using track ID and version from stage
        const stemResponse = await streamingService.getMasterStemStreams(
          stage.track.id,
          stage.version
        );

        if (stemResponse.success && stemResponse.data) {
          setStageStems(stemResponse.data.stems);
          console.log('[DEBUG] Loaded stage stems:', stemResponse.data.stems);
        } else {
          console.error('Failed to load stage stems:', stemResponse.message);
          setStageStems([]);
        }
      } catch (error) {
        console.error('Error loading stems by stage ID:', error);
        setStageStems([]);
      } finally {
        setStemsLoading(false);
      }
    };

    loadStemsByStageId();
  }, [stageId]);

  // 스템 상태 초기화
  useEffect(() => {
    const initialStates: Record<string, StemState> = {};
    activeStemsData.forEach(stem => {
      initialStates[stem.id] = {
        volume: 1,
        muted: false,
        currentTime: 0,
        duration: 0,
        isPlaying: false
      };
    });
    setStemStates(initialStates);
  }, [activeStemsData]);

  // selectedStems 초기화
  useEffect(() => {
    const initialSelected: Record<string, boolean> = {};
    activeStemsData.forEach(stem => {
      initialSelected[stem.id] = false;
    });
    setSelectedStems(initialSelected);
  }, [activeStemsData]);

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

  // 마스터 정지 - 가이드만 정지
  const handleMasterStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Reset guide audio only
    if (guideAudioRef.current) {
      guideAudioRef.current.pause();
      guideAudioRef.current.currentTime = 0;
    }
    
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

  // 시간 업데이트 - 스템들은 독립적으로 시간 관리
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

  // 체크박스 토글 핸들러
  const toggleSelect = (stemId: string) => {
    setSelectedStems(prev => ({
      ...prev,
      [stemId]: !prev[stemId]
    }));
  };

  // 다운로드 모드 토글
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      // 취소 시 선택 상태 초기화
      const resetSelected: Record<string, boolean> = {};
      activeStemsData.forEach(stem => {
        resetSelected[stem.id] = false;
      });
      setSelectedStems(resetSelected);
    }
  };

  // 개별 가이드 다운로드
  const handleGuideDownload = async () => {
    if (!stageId) return;
    
    try {
      const response = await streamingService.getGuidePresignedUrlByStageId(stageId);
      if (response.success && response.data) {
        const blob = await fetch(response.data.presignedUrl).then(res => res.blob());
        const fileName = `guide_${stageId}.mp3`;
        saveAs(blob, fileName);
      }
    } catch (error) {
      console.error('Failed to download guide:', error);
    }
  };

  // 선택된 스템들 일괄 다운로드
  const handleExport = async () => {
    const selectedStemIds = Object.keys(selectedStems).filter(id => selectedStems[id]);
    if (selectedStemIds.length === 0) return;

    try {
      // 선택된 스템들의 다운로드 진행
      for (const stemId of selectedStemIds) {
        const stem = activeStemsData.find(s => s.id === stemId);
        if (stem) {
          const blob = await fetch(stem.presignedUrl).then(res => res.blob());
          const fileName = stem.fileName || `stem_${stemId}.mp3`;
          saveAs(blob, fileName);
        }
      }
      
      // 다운로드 완료 후 선택 모드 해제
      setSelectMode(false);
      const resetSelected: Record<string, boolean> = {};
      activeStemsData.forEach(stem => {
        resetSelected[stem.id] = false;
      });
      setSelectedStems(resetSelected);
    } catch (error) {
      console.error('Failed to export stems:', error);
    }
  };

  // 프로그레스 바 클릭 핸들러 - 가이드 오디오만 제어
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const barWidth = rect.width;
    const newTime = (clickX / barWidth) * maxDuration;
    
    setCurrentTime(newTime);

    // 가이드 오디오 시간 변경만
    if (guideAudioRef.current && guideUrl) {
      guideAudioRef.current.currentTime = newTime;
    }
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

  if (stemsLoading) {
    return (
      <div className={`p-6 bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center text-gray-400">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-3"></div>
            <p>스템 파일을 로딩 중입니다...</p>
          </div>
        </div>
      </div>
    );
  }

  if (activeStemsData.length === 0) {
    return (
      <div className={`p-6 bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center text-gray-400">
          <p>스템 파일이 없습니다.</p>
          {stageId && stageInfo && (
            <p className="text-sm mt-2">스테이지 V{stageInfo.version}에는 스템이 없습니다.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-gray-900 rounded-lg ${className}`}>
      {/* 스테이지 정보 헤더 */}
      {/* {stageId && stageInfo && (
        <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-purple-400 font-semibold">
                {stageInfo.title} (V{stageInfo.version})
              </h4>
              <p className="text-gray-300 text-sm">{stageInfo.description}</p>
            </div>
            <div className="text-xs text-gray-400">
              <p>스테이지 ID: {stageId}</p>
              <p>총 {activeStemsData.length}개 스템</p>
            </div>
          </div>
        </div>
      )} */}

      {/* 마스터 컨트롤 */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {stageId && stageInfo ? `스테이지 컨트롤 (V${stageInfo.version})` : '마스터 컨트롤'}
          </h3>
          <div className="flex items-center gap-3">
            {stageId && (
              <button
                onClick={handleGuideDownload}
                className="group relative p-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 bg-[#893AFF] hover:from-#893AFF hover:to-blue-600 text-white shadow-sm hover:shadow-md"
                title="가이드 다운로드"
              >
                <Download size={20} className="drop-shadow-sm" />
                <div className="absolute inset-0 rounded-lg bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
              </button>
            )}
            <button
              onClick={handleMasterMuteToggle}
              className={`group relative p-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                masterMuted 
                  ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-gray-300 hover:text-white shadow-sm hover:shadow-md'
              }`}
            >
              {masterMuted ? <VolumeX size={20} className="drop-shadow-sm" /> : <Volume2 size={20} className="drop-shadow-sm" />}
              <div className="absolute inset-0 rounded-lg bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
            </button>
            
            <div className="relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={masterMuted ? 0 : masterVolume}
                onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                className="w-28 h-2 bg-gray-700 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(masterMuted ? 0 : masterVolume) * 100}%, #4b5563 ${(masterMuted ? 0 : masterVolume) * 100}%, #4b5563 100%)`
                }}
              />
              <style dangerouslySetInnerHTML={{
                __html: `
                  input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: linear-gradient(to bottom, #ffffff, #e5e7eb);
                    border: 2px solid #10b981;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    transition: all 0.2s ease;
                  }
                  input[type="range"]::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                  }
                  input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: linear-gradient(to bottom, #ffffff, #e5e7eb);
                    border: 2px solid #10b981;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    border: none;
                  }
                `
              }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleMasterPlayPause}
            disabled={guideLoading}
            className="group relative flex items-center justify-center w-14 h-14 bg-[#893AFF] hover:bg-purple-700 disabled:bg-gray-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {guideLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={20} className="drop-shadow-sm" />
            ) : (
              <Play size={20} className="ml-0.5 drop-shadow-sm" />
            )}
            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
          </button>
          
          <button
            onClick={handleMasterStop}
            className="group relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 rounded-full shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <Square size={20} className="text-white drop-shadow-sm" />
            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
          </button>
          
          <div className="text-sm text-gray-400 font-medium">
            {formatTime(currentTime)} / {formatTime(maxDuration)}
          </div>
          {stageId && (
            <div className="flex items-center gap-2 text-xs ml-2">
              <div className={`w-2 h-2 rounded-full ${guideLoading ? 'bg-yellow-400 animate-pulse' : guideUrl ? 'bg-emerald-400' : 'bg-gray-500'}`}></div>
              <span className={`${guideLoading ? 'text-yellow-400' : guideUrl ? 'text-emerald-400' : 'text-gray-400'} font-medium`}>
                {guideLoading ? '가이드 로딩 중...' : 
                 guideUrl ? '가이드 재생 중' : '가이드 재생 가능'}
              </span>
            </div>
          )}
        </div>

        {/* 프로그레스 바 */}
        <div
          className="relative w-full h-3 bg-gray-700 rounded-full cursor-pointer overflow-hidden shadow-inner group"
          onClick={handleProgressBarClick}
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-100 shadow-sm"
            style={{
              width: `${maxDuration > 0 ? (currentTime / maxDuration) * 100 : 0}%`
            }}
          />
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-200 rounded-full"></div>
        </div>
      </div>

      {/* 스템 리스트 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">
            {stageId && stageInfo ? `Stem Track (V${stageInfo.version})` : '스템 트랙'}
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectMode}
              className={`inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-sm rounded-lg ${
                selectMode 
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500' 
                  : 'bg-[#595959] text-[#D9D9D9] hover:bg-[#BFBFBF] hover:text-[#0D0D0D] focus:ring-[#BFBFBF]'
              }`}
            >
              {selectMode ? 'cancled' : 'download'}
            </button>
            {selectMode && (
              <button
                onClick={handleExport}
                disabled={Object.values(selectedStems).every(selected => !selected)}
                className="inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[#893AFF] hover:bg-[#7934E2] text-white focus:ring-[#7934E2] px-3 py-2 text-sm rounded-lg"
              >
                Download Stems
              </button>
            )}
          </div>
        </div>
        {activeStemsData.map((stem) => (
          <div key={stem.id} className="flex items-center gap-3">
            {selectMode && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedStems[stem.id] || false}
                  onChange={() => toggleSelect(stem.id)}
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                />
              </div>
            )}
            <div className="flex-1">
              <AudioPlayer
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
            </div>
          </div>
        ))}
      </div>

      {/* 툴바 */}
      <div className="mt-6 pt-6 border-t border-[#595959] flex justify-end">
        <button 
        onClick = {() => onShowStage?.(stageId || '')}
        className="inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[#595959] text-[#D9D9D9] hover:bg-[#BFBFBF] hover:text-[#0D0D0D] focus:ring-[#BFBFBF] px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700">
          History
        </button>
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