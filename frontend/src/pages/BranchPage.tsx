import React, { useState, useRef, useEffect } from 'react';

import Logo from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import SessionBestService from '../services/sessionBestService';
import CategoryService from '../services/categoryService';
import StreamingService from '../services/streamingService';

import {
  Play,
  Pause,
  Download,
  Headphones,
  VolumeX,
  Square,
  ChevronsRight,
  Volume2,
  // Upload,
} from 'lucide-react';

import Multitrack from 'wavesurfer-multitrack';
import CollaboratePanel from '../components/CollaboratePanel';
import { Category } from '../types/api';

// 이력 mock 데이터 타입
interface HistoryType {
  id: string;
  name: string;
  tag: string;
  user: string;
  description: string;
  date: string;
}

// 히스토리 데이터는 상태로 관리
// const mockHistories: HistoryType[] = [];

const audioFiles = ['/audio/Track_ex/1.wav', '/audio/Track_ex/2.wav'];

const peakFiles = [
  '/peaks/Clap.wav_waveform_563601bb.json',          // 1번 트랙
  '/peaks/fx_reverserise.wav_waveform_54e48434.json',  // 2번 트랙
  '/peaks/guitar pluck.wav_waveform_7c5e565f.json', // 3번 트랙
  '/peaks/PoliceSiren.wav_waveform_b7778508.json'    // 업데이트 후 사용
  // '/peaks/111.json',
  // '/peaks/222.json',
];

const colorMap: Record<string, string> = {
  'bg-red-700': '#b91c1c',
  'bg-red-400': '#f87171',
};

interface Track {
  id: string;
  name: string;
  user: string;
  tag: string;
  description: string;
  date: string;
  audioUrl: string; // 오디오 스트리밍 URL
  peaksUrl?: string; // peaks 데이터 URL
  isMuted: boolean;
  volume: number;
  file_path?: string; // 오디오 파일 경로 추가
  category?: Category; // 카테고리 ID 추가
  peaks?: number[];
}

const BranchPage: React.FC = () => {
  const [showHistoryIndex, setShowHistoryIndex] = useState<number | null>(null);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<
    number | null
  >(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number | null>(
    null
  );
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  // const [setIsAudioLoaded] = useState(false);
  const multitrackRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [soloTrackId, setSoloTrackId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const timeMarkers = Array.from({ length: 9 }, (_, i) => i);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [histories, setHistories] = useState<HistoryType[]>([]);
  const [isTracksUpdated, setIsTracksUpdated] = useState(false); // 트랙 업데이트 여부 추적

  const loadPeaksData = async (peakFile: string) => {
    try {
      console.log('🔵 Loading peaks data from:', peakFile);
      const response = await fetch(peakFile);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const peaksData = await response.json();
      console.log('🔵 Successfully loaded peaks data:', {
        file: peakFile,
        peaksLength: peaksData.peaks?.length || 0,
        hasData: !!peaksData.peaks
      });
      return peaksData.peaks;
    } catch (error) {
      console.error('🔴 Error loading peaks data:', {
        file: peakFile,
        error: error
      });
      return null;
    }
  };

  // Initialize multitrack on component mount
  useEffect(() => {
    if (!containerRef.current || tracks.length === 0) {
      console.log('🔴 Multitrack 초기화 조건 불만족:', {
        hasContainer: !!containerRef.current,
        tracksLength: tracks.length
      });
      return;
    }

    const initializeMultitrack = async () => {
      console.log('🔵 Starting multitrack initialization with tracks:', tracks.length);
      
      // Load peaks data for each track
      const peaksDataPromises = peakFiles.map((peakFile) =>
        loadPeaksData(peakFile)
      );
      const peaksDataResults = await Promise.all(peaksDataPromises);
      console.log('🔵 All peaks data loaded:', peaksDataResults);

      // Convert tracks to multitrack format
      const multitrackTracks = tracks.map((track, index) => {
        let trackPeaks;
        
        if (isTracksUpdated) {
          // 트랙이 업데이트된 경우: 모든 트랙에 PoliceSiren.json 파형 사용
          const policeIndex = peakFiles.findIndex(file => file.includes('PoliceSiren.wav_waveform_b7778508.json'));
          trackPeaks = policeIndex !== -1 ? peaksDataResults[policeIndex] : peaksDataResults[index % peaksDataResults.length];
          console.log(`Creating track ${index + 1} with PoliceSiren peaks data:`, trackPeaks);
        } else {
          // 초기 로딩 시: 순서대로 다른 파형 사용 (Clap.json, guitar pluck.json, fx_reverserise.json)
          trackPeaks = peaksDataResults[index % 3]; // 처음 3개 파형만 순환
          console.log(`Creating track ${index + 1} with initial peaks data:`, trackPeaks);
        }
        
        return {
          id: index + 1,
          // 스트리밍 URL이 있다면 사용, 없으면 mock 데이터 사용
          url: track.audioUrl || audioFiles[index % audioFiles.length],
          peaks: trackPeaks,
          startPosition: 0,
          volume: track.volume,
          draggable: false,
          options: {
            waveColor: colorMap['bg-red-700'],
            progressColor: '#ffffff',
            height: 113,
            normalize: true,
            barWidth: 2,
            barGap: 1,
            xhr: {
              credentials: 'same-origin',
            },
          },
        };
      });

      const container = containerRef.current;
      if (!container) return;

      console.log('🔵 Creating multitrack with tracks:', multitrackTracks);

      // Destroy existing multitrack if it exists
      if (multitrackRef.current) {
        console.log('🔵 기존 multitrack 인스턴스 제거');
        multitrackRef.current.destroy();
      }

      // Create multitrack instance with type assertion
      try {
        console.log('🔵 새로운 multitrack 인스턴스 생성 시작');
        multitrackRef.current = Multitrack.create(multitrackTracks as any, {
          container,
          minPxPerSec: 100,
          cursorColor: '#ffffff',
          cursorWidth: 2,
          trackBackground: '#374151',
          trackBorderColor: '#4B5563',
        });
        console.log('🔵 Multitrack 인스턴스 생성 완료');
      } catch (error) {
        console.error('🔴 Multitrack 인스턴스 생성 실패:', error);
        return;
      }

      // Set up event listeners
      multitrackRef.current.once('canplay', () => {
        setIsReady(true);
        console.log('🔵 Multitrack is ready to play');
      });

      multitrackRef.current.on('loading', (percent: number) => {
        console.log('🔵 Loading audio:', percent + '%');
      });

      multitrackRef.current.on('ready', () => {
        console.log('🔵 Audio is loaded and ready');
      });

      multitrackRef.current.on('error', (error: any) => {
        console.error('🔴 Multitrack error:', error);
      });

      // Animation loop for updating current time
      const updateTime = () => {
        if (multitrackRef.current) {
          setCurrentTime(multitrackRef.current.getCurrentTime());
          setIsPlaying(multitrackRef.current.isPlaying());
        }
        animationRef.current = requestAnimationFrame(updateTime);
      };
      updateTime();
    };

    initializeMultitrack();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (multitrackRef.current) {
        multitrackRef.current.destroy();
      }
    };
  }, [tracks]); // tracks를 dependency로 추가

  const togglePlay = () => {
    if (!multitrackRef.current || !isReady) return;

    console.log('Toggle play clicked');

    if (multitrackRef.current.isPlaying()) {
      console.log('Pausing playback');
      multitrackRef.current.pause();
    } else {
      console.log('Starting playback');
      if (multitrackRef.current.isPlaying()) {
        console.log('Pausing playback');
        multitrackRef.current.pause();
      } else {
        console.log('Starting playback');
        multitrackRef.current.play();
      }
    }
  };

  const toggleTrackMute = (trackId: string) => {
    const trackIndex = tracks.findIndex((track) => track.id === trackId);
    if (trackIndex === -1 || !multitrackRef.current) return;

    const track = tracks[trackIndex];
    const newMuted = !track.isMuted;

    console.log('🔵 트랙 뮤트 토글:', {
      trackId,
      trackIndex,
      currentMuted: track.isMuted,
      newMuted,
      volume: track.volume
    });

    // 멀티트랙 볼륨 업데이트 (뮤트 0, 뮤트 해제 원래 볼륨)
    multitrackRef.current.setTrackVolume(
      trackIndex,
      newMuted ? 0 : track.volume
    );

    // 상태 업데이트
    setTracks((prevTracks) =>
      prevTracks.map((track) =>
        track.id === trackId ? { ...track, isMuted: newMuted } : track
      )
    );
  };

  const toggleTrackSolo = (trackId: string) => {
    const trackIndex = tracks.findIndex((track) => track.id === trackId);
    if (trackIndex === -1 || !multitrackRef.current) return;

    console.log('🔵 트랙 솔로 토글:', {
      trackId,
      trackIndex,
      currentSoloTrackId: soloTrackId,
      isCurrentlySolo: soloTrackId === trackId
    });

    if (soloTrackId === trackId) {
      // 솔로 트랙 해제 - 모든 트랙 원래 볼륨으로 복구
      console.log('🔵 솔로 해제 - 모든 트랙 원래 볼륨으로 복구');
      setSoloTrackId(null);
      tracks.forEach((track, index) => {
        const volume = track.isMuted ? 0 : track.volume;
        console.log(`🔵 트랙 ${index + 1} 볼륨 복구:`, volume);
        multitrackRef.current.setTrackVolume(index, volume);
      });
    } else {
      // 솔로 트랙 설정 - 나머지 트랙 뮤트
      console.log('🔵 솔로 설정 - 나머지 트랙 뮤트');
      setSoloTrackId(trackId);
      tracks.forEach((track, index) => {
        if (index === trackIndex) {
          // Keep this track's volume or mute if it's muted
          const volume = track.isMuted ? 0 : track.volume;
          console.log(`🔵 솔로 트랙 ${index + 1} 볼륨:`, volume);
          multitrackRef.current.setTrackVolume(index, volume);
        } else {
          // 나머지 트랙 뮤트
          console.log(`🔵 트랙 ${index + 1} 뮤트`);
          multitrackRef.current.setTrackVolume(index, 0);
        }
      });
    }
  };
  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!multitrackRef.current || !containerRef.current || !isReady) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;

    multitrackRef.current.seekTo(Math.max(0, Math.min(percentage, 1)));
  };

  // 이력 교체
  const handleChangeStem = async () => {
    if (showHistoryIndex !== null && selectedHistoryIndex !== null && sessionId) {
      const history = histories[selectedHistoryIndex];
      const currentTrack = tracks[showHistoryIndex];
      
      // session-best 업데이트 요청
      try {
        console.log('Updating session-best with:', {
          session_id: sessionId,
          category_id: currentTrack.category?.id,
          stem_id: history.id,
        });

        // 현재 트랙의 카테고리 ID가 있는지 확인
        if (!currentTrack.category?.id) {
          console.error('Category ID is missing for current track');
          return;
        }

        await SessionBestService.createSessionBest({
          session_id: sessionId,
          category_id: currentTrack.category.id,
          stem_id: history.id,
        });

        console.log('Session-best updated successfully');

        // 성공 후 session-best 목록을 다시 불러와서 화면 갱신
        console.log('🔵 스템 변경 후 SessionBest 데이터 다시 요청');
        const response = await SessionBestService.getSessionBest(sessionId);
        console.log('🔵 스템 변경 후 SessionBest 응답:', response);
        
        if (response.data && Array.isArray(response.data)) {
          // 모든 stem ID 수집
          const stemIds = response.data.map((item: any) => item.stem_file.id).filter(Boolean);
          console.log('🔵 스템 변경 후 수집된 stem IDs:', stemIds);
          
          // 배치로 스트리밍 URL 가져오기
          let streamingUrls: { [key: string]: string } = {};
          if (stemIds.length > 0) {
            console.log('🔵 스템 변경 후 스트리밍 URL 배치 요청');
            try {
              const streamingResponse = await StreamingService.getBatchStreamingUrls(stemIds);
              console.log('🔵 스템 변경 후 스트리밍 서비스 응답:', streamingResponse);
              
              if (streamingResponse.success && streamingResponse.data) {
                streamingUrls = streamingResponse.data.streams.reduce((acc: any, stream: any) => {
                  acc[stream.stemId] = stream.presignedUrl;
                  return acc;
                }, {});
                console.log('🔵 스템 변경 후 최종 스트리밍 URLs:', streamingUrls);
              } else {
                console.log('🔴 스템 변경 후 스트리밍 서비스 응답 실패:', streamingResponse);
              }
            } catch (streamingError) {
              console.error('🔴 스템 변경 후 스트리밍 URL 요청 실패:', streamingError);
            }
          }

          const newTracks = response.data.map((item: any, index: number) => ({
            id: item.stem_file.id || `track-${index}`,
            name: item.stem_file.file_name || `Track ${index + 1}`,
            user: item.user?.name || 'Unknown',
            tag: item.category?.name || 'No tag',
            description: item.description || 'No description',
            date: new Date(item.created_at || Date.now()).toLocaleDateString(),
            audioUrl: streamingUrls[item.stem_file.id] || item.file_path, // 스트리밍 URL 우선, 없으면 file_path
            isMuted: false,
            volume: 1,
            file_path: item.file_path,
            category: item.category,
          }));
          setTracks(newTracks);
          setIsTracksUpdated(true); // 트랙 업데이트 플래그 설정
        }

        // 패널 닫기
        setShowHistoryIndex(null);
        setSelectedHistoryIndex(null);
        setHistories([]);
      } catch (error) {
        console.error('Failed to update session-best:', error);
        // 에러 처리 - 사용자에게 알림을 보여줄 수 있음
      }
    }
  };

  // 트랙 재생
  const handleTrackPlay = (idx: number) => {
    setSelectedTrackIndex(idx);
    setIsPlaying(true);
  };

  // 히스토리 재생
  const handleHistoryPlay = (idx: number) => {
    setSelectedHistoryIndex(idx);
    setSelectedTrackIndex(idx);
    setIsPlaying(true);
  };

  // 하단 플레이어 재생/일시정지
  // const handlePlayPause = () => {
  //   setIsPlaying((prev) => !prev);
  // };

  const trackId = new URLSearchParams(window.location.search).get('projectId');
  const sessionId = new URLSearchParams(window.location.search).get('sessionId');

  // Session Best 목록 가져오기 및 스트리밍 URL 설정
  useEffect(() => {
    const fetchSessionBest = async () => {
      if (!sessionId) {
        console.log('🔴 SessionId가 없습니다. 기본 상태를 유지합니다.');
        return;
      }

      try {
        console.log('🔵 SessionBest 데이터 요청 시작:', sessionId);
        const response = await SessionBestService.getSessionBest(sessionId);
        console.log('🔵 SessionBest 응답 전체:', response);
        console.log('🔵 SessionBest 응답 데이터:', response.data);
        
        if (response.data && Array.isArray(response.data)) {
          // 모든 stem ID 수집
          const stemIds = response.data.map((item: any) => item.stem_file.id).filter(Boolean);
          console.log('🔵 수집된 stem IDs:', stemIds);
          console.log('🔵 session-best 원본 데이터:', response.data);
          
          // 배치로 스트리밍 URL 가져오기
          let streamingUrls: { [key: string]: string } = {};
          if (stemIds.length > 0) {
            console.log('🔵 스트리밍 URL 배치 요청 시작:', stemIds);
            try {
              const streamingResponse = await StreamingService.getBatchStreamingUrls(stemIds);
              console.log('🔵 스트리밍 서비스 응답 전체:', streamingResponse);
              console.log('🔵 스트리밍 서비스 응답 데이터:', streamingResponse.data);
              
              if (streamingResponse.success && streamingResponse.data) {
                console.log('🔵 스트리밍 streams 배열:', streamingResponse.data.streams);
                streamingUrls = streamingResponse.data.streams.reduce((acc: any, stream: any) => {
                  console.log('🔵 스트리밍 URL 매핑:', stream.stemId, '->', stream.presignedUrl);
                  acc[stream.stemId] = stream.presignedUrl;
                  return acc;
                }, {});
                console.log('🔵 최종 스트리밍 URLs 객체:', streamingUrls);
              } else {
                console.log('🔴 스트리밍 서비스 응답 실패:', streamingResponse);
              }
            } catch (streamingError) {
              console.error('🔴 스트리밍 URL 요청 실패:', streamingError);
            }
          } else {
            console.log('🔴 stem IDs가 없습니다. 스트리밍 URL 요청 건너뜀');
          }

          const newTracks = response.data.map((item: any, index: number) => ({
            id: item.stem_file.id || `track-${index}`,
            name: item.stem_file.file_name || `Track ${index + 1}`,
            user: item.user?.name || 'Unknown',
            tag: item.category?.name || 'No tag',
            description: item.description || 'No description',
            date: new Date(item.created_at || Date.now()).toLocaleDateString(),
            audioUrl: streamingUrls[item.stem_file.id] || item.file_path, // 스트리밍 URL 우선, 없으면 file_path
            isMuted: false,
            volume: 1,
            file_path: item.file_path, // 오디오 파일 경로 추가
            category: item.category, // 카테고리 ID 추가
          }));
          console.log(newTracks);
          setTracks(newTracks);
        }
      } catch (error) {
        console.error('Session Best 목록 불러오기 실패:', error);
        // 에러 발생 시 빈 배열로 설정
        setTracks([]);
      }
    };

    fetchSessionBest();
  }, [sessionId]);

  const handleMasterClick = () => {
    navigate(`/master?trackId=${trackId}`);
  };

  const handleAddFile = () => {
    if (trackId) {
      navigate(`/commit?projectId=${trackId}&sessionId=${sessionId}`);
    } else {
      // trackId가 없는 경우 대시보드로 이동
      navigate('/dashboard');
    }
  };

  const handlePrClick = () => {
    navigate(`/pr?trackId=${trackId}&sessionId=${sessionId}`);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  const handleCollaborateClick = () => {
    setIsPanelOpen(true);
  };

  // 카테고리별 히스토리 불러오기
  const fetchCategoryHistory = async (categoryId: string) => {
    try {
      const response = await CategoryService.getCategoryHistory(categoryId);
      
      if (response.success && response.data) {
        const historyData = response.data.flatMap((categoryItem: any) => 
          categoryItem.category_stem_file.map((stemFile: any) => ({
            id: stemFile.id,
            name: stemFile.file_name,
            tag: stemFile.tag || 'No tag',
            user: 'Unknown', // API에서 사용자 정보가 없는 경우 기본값
            description: stemFile.description || 'No description',
            date: new Date(stemFile.uploaded_at).toLocaleDateString(),
            file_path: stemFile.file_path,
          }))
        );
        setHistories(historyData);
      }
    } catch (error) {
      console.error('히스토리 불러오기 실패:', error);
      setHistories([]);
    }
  };

  return (
    <div
      className='flex h-screen w-screen flex-col text-white'
      style={{ backgroundColor: '#000000' }}
    >
      {/* Header */}
      <header className='flex-shrink-0 shadow-lg'>
        <div className='px-8 py-6 border-b' style={{ backgroundColor: '#000000', borderBottomColor: '#ffffff' }}>
          <div className='flex items-center justify-between'>
            {/* Logo */}
            <div className='flex items-center'>
              <div className='flex items-center space-x-3'>
                <Logo />
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex items-center space-x-3'>
              <button
                className="rounded-lg px-6 py-2.5 font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                style={{ backgroundColor: '#0726D9' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#52C5F2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0726D9'}
                onClick={handleAddFile}
              >
                Upload
              </button>
              <button
                className='rounded-lg px-6 py-2.5 font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105'
                style={{ backgroundColor: '#0726D9' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#52C5F2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0726D9'}
                onClick={handlePrClick}
              >
                Drop
              </button>
              <button
                className='rounded-lg px-6 py-2.5 font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105'
                style={{ backgroundColor: '#0726D9' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#52C5F2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0726D9'}
                onClick={handleMasterClick}
              >
                BASE MIX
              </button>
              {/* 협업 패널 */}
              <div className="relative">
                <button 
                  className='rounded-lg px-6 py-2.5 font-medium text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105'
                  style={{ backgroundColor: '#0726D9' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#52C5F2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0726D9'}
                  onClick={handleCollaborateClick}
                >
                  Collaborate
                </button>
                <CollaboratePanel 
                  isOpen={isPanelOpen}
                  onClose={handleClosePanel}
                  trackId={trackId || undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className='flex flex-1 overflow-hidden'>
        {/* History Panel - Left Side */}
        {showHistoryIndex !== null && (
          <aside className='flex w-72 flex-shrink-0 flex-col border-r shadow-2xl transition-all duration-300 ease-in-out' style={{ backgroundColor: '#000000', borderRightColor: '#ffffff' }}>
            {/* Close Button */}
            <div className='flex justify-between items-center p-4 border-b' style={{ borderBottomColor: '#ffffff' }}>
              <h3 className='text-lg font-semibold text-white'>History</h3>
              <button
                onClick={() => {
                  setShowHistoryIndex(null);
                  setSelectedHistoryIndex(null);
                }}
                className='text-gray-300 hover:text-white rounded-full p-1 transition-all duration-200'
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>

            {/* History List */}
            <div className='flex-1 overflow-y-auto p-4 space-y-3'>
              {histories.map((history, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-4 cursor-pointer transition-all duration-200 transform hover:scale-102`}
                  style={{
                    backgroundColor: selectedHistoryIndex === idx ? '#333333' : '#000000',
                    borderColor: selectedHistoryIndex === idx ? '#ffffff' : '#333333'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedHistoryIndex !== idx) {
                      e.currentTarget.style.backgroundColor = '#000000';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedHistoryIndex !== idx) {
                      e.currentTarget.style.backgroundColor = '#000000';
                    }
                  }}
                  onClick={() => {
                    setSelectedHistoryIndex(idx);
                    setSelectedTrackIndex(idx);
                  }}
                >
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <h4 className='text-sm font-semibold text-white truncate'>
                        {history.name}
                      </h4>
                      {history.tag && (
                        <span className='text-xs text-white px-2 py-1 rounded-full' style={{ backgroundColor: '#0726D9' }}>
                          {history.tag}
                        </span>
                      )}
                    </div>
                    
                    {/* <div className='text-xs text-gray-300'>
                      by <span className='font-medium text-white'>{history.user}</span>
                    </div>
                    
                    <p className='text-xs text-gray-400 line-clamp-2'>
                      {history.description}
                    </p> */}
                    
                    <div className='flex items-center justify-between pt-2'>
                      <span className='text-xs text-gray-400'>
                        {history.date}
                      </span>
                      <div className='flex items-center space-x-2'>
                        <button
                          className='rounded-full p-1.5 transition-colors duration-200'
                          style={{ backgroundColor: '#ffffff' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHistoryPlay(idx);
                          }}
                        >
                          <Play size={14} />
                        </button>
                        <button
                          className='rounded-md px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed transition-colors duration-200'
                          style={{ 
                            backgroundColor: selectedHistoryIndex === idx ? '#0726D9' : '#6b7280',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedHistoryIndex === idx) {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedHistoryIndex === idx) {
                              e.currentTarget.style.backgroundColor = '#0726D9';
                            }
                          }}
                          disabled={selectedHistoryIndex !== idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChangeStem();
                          }}
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Track Area */}
        <main className='flex flex-1 flex-col min-w-0'>
          <div className='flex-1 overflow-y-auto' style={{ backgroundColor: '#000000' }}>
            <div className='p-6'>
              {/* Time Markers */}
              <div className='mb-6 ml-80 flex justify-between px-4'>
                {timeMarkers.map((marker) => (
                  <div key={marker} className='flex flex-col items-center'>
                    <div className='mb-2 h-3 w-px' style={{ backgroundColor: '#ffffff' }}></div>
                    <span className='text-sm font-medium' style={{ color: '#ffffff' }}>{marker}</span>
                  </div>
                ))}
              </div>

              {/* Track Controls and Waveforms */}
              <div className='relative'>
                <div className='space-y-1'>
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className='overflow-hidden rounded-lg border shadow-lg transition-shadow hover:shadow-xl'
                      style={{ backgroundColor: '#000000', borderColor: '#ffffff' }}
                    >
                      <div className='flex items-center'>
                        {/* Track Control */}
                        <div className='w-80 p-4'>
                          <div className='flex items-center space-x-3'>
                            <button
                              onClick={() => handleTrackPlay(index)}
                              disabled={!isReady}
                              className={`rounded-full p-2 transition-colors ${
                                isPlaying && selectedTrackIndex === index
                                  ? 'text-white'
                                  : 'text-gray-300'
                              } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                              style={{
                                backgroundColor: isPlaying && selectedTrackIndex === index ? '#ffffff' : '#ffffff'
                              }}
                              onMouseEnter={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor = '#ffffff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor = isPlaying && selectedTrackIndex === index ? '#ffffff' : '#ffffff';
                                }
                              }}
                            >
                              {isPlaying && selectedTrackIndex === index ? (
                                <Pause className='h-4 w-4' />
                              ) : (
                                <Play className='h-4 w-4' />
                              )}
                            </button>
                            <button 
                              className='rounded-full p-2 text-gray-300 transition-colors'
                              style={{ backgroundColor: '#ffffff' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                            >
                              <Download className='h-4 w-4' />
                            </button>
                            <button
                              onClick={() => toggleTrackSolo(track.id)}
                              disabled={!isReady}
                              className={`rounded-full p-2 transition-colors ${
                                soloTrackId === track.id
                                  ? 'text-white'
                                  : 'text-gray-300'
                              } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                              style={{
                                backgroundColor: soloTrackId === track.id ? '#0726D9' : '#ffffff'
                              }}
                              onMouseEnter={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor = soloTrackId === track.id ? '#ffffff' : '#ffffff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor = soloTrackId === track.id ? '#0726D9' : '#ffffff';
                                }
                              }}
                            >
                              <Headphones className='h-4 w-4' />
                            </button>
                            <button
                              onClick={() => toggleTrackMute(track.id)}
                              disabled={!isReady}
                              className={`rounded-full p-2 transition-colors ${
                                track.isMuted
                                  ? 'text-white'
                                  : 'text-gray-300'
                              } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                              style={{
                                backgroundColor: track.isMuted ? '#ffffff' : '#ffffff'
                              }}
                              onMouseEnter={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor = track.isMuted ? '#ffffff' : '#ffffff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor = track.isMuted ? '#ffffff' : '#ffffff';
                                }
                              }}
                            >
                              {track.isMuted ? (
                                <VolumeX className='h-4 w-4' />
                              ) : (
                                <Volume2 className='h-4 w-4' />
                              )}
                            </button>
                            <div className='flex-1'>
                              <button
                                onClick={() => {
                                  setSelectedTrackIndex(index);
                                  setShowHistoryIndex(index);
                                  // 카테고리 ID가 있으면 히스토리 불러오기
                                  console.log(track.category?.id);

                                  if (track.category?.id) {
                                    fetchCategoryHistory(track.category?.id);
                                  } else {
                                    // 카테고리 ID가 없으면 빈 히스토리 설정
                                    setHistories([]);
                                  }
                                }}
                                className='w-full text-left bg-gray-700 duration-200'
                                style={{ color: '#ffffff' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                              >
                                <div className='text-sm font-medium text-white'>
                                  {track.name}
                                </div>
                                <div className='text-xs text-gray-300' style={{ color: '#ffffff' }}>
                                  {track.tag || 'No tag'}
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Track waveform area */}
                        <div className='relative flex-1'>
                          <div
                            className='relative h-[110px] w-full border-l-4'
                            style={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              borderLeftColor: '#ffffff'
                            }}
                            data-track-id={track.id}
                          >
                            {!isReady && (
                              <div className='absolute inset-0 flex items-center justify-center'>
                                <div className='text-sm' style={{ color: '#ffffff' }}>
                                  Loading...
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Multitrack Container */}
                <div
                  ref={containerRef}
                  className='absolute inset-0 z-10 ml-80'
                  onClick={handleSeek}
                  style={{ pointerEvents: 'auto', background: 'transparent' }}
                />
              </div>
            </div>
          </div>

          {/* Transport Controls */}
          <footer className='flex-shrink-0 border-t shadow-2xl' style={{ backgroundColor: '#000000', borderTopColor: '#ffffff' }}>
            <div className='px-8 py-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-4'>
                  <button
                    onClick={togglePlay}
                    disabled={!isReady}
                    className={`rounded-full p-4 transition-all duration-200 transform hover:scale-110 shadow-lg ${
                      isPlaying
                        ? 'text-white'
                        : 'text-white'
                    } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                    style={{
                      backgroundColor: isPlaying ? '#ffffff' : '#000000',
                      color: isPlaying ? '#000000' : '#ffffff'
                    }}
                    onMouseEnter={(e) => {
                      if (isReady) {
                        e.currentTarget.style.backgroundColor = isPlaying ? '#ffffff' : '#000000';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isReady) {
                        e.currentTarget.style.backgroundColor = isPlaying ? '#ffffff' : '#000000';
                      }
                    }}
                  >
                    {isPlaying ? (
                      <Pause className='h-6 w-6' />
                    ) : (
                      <Play className='h-6 w-6' />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (multitrackRef.current && isReady) {
                        multitrackRef.current.setTime(0);
                      }
                    }}
                    disabled={!isReady}
                    className={`rounded-xl p-3 text-gray-300 transition-all duration-200 transform hover:scale-110 ${
                      !isReady ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                    style={{ backgroundColor: '#ffffff' }}
                    onMouseEnter={(e) => {
                      if (isReady) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isReady) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }
                    }}
                  >
                    <Square className='h-5 w-5' />
                  </button>
                  <button
                    onClick={() => {
                      if (multitrackRef.current && isReady) {
                        multitrackRef.current.setTime(
                          multitrackRef.current.getCurrentTime() + 10
                        );
                      }
                    }}
                    disabled={!isReady}
                    className={`rounded-xl p-3 text-gray-300 transition-all duration-200 transform hover:scale-110 ${
                      !isReady ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                    style={{ backgroundColor: '#ffffff' }}
                    onMouseEnter={(e) => {
                      if (isReady) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isReady) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }
                    }}
                  >
                    <ChevronsRight className='h-5 w-5' />
                  </button>
                </div>
                <div className='flex items-center space-x-4'>
                  <div className='rounded-xl px-4 py-2 text-sm font-mono shadow-inner' style={{ backgroundColor: '#000000', color: '#ffffff' }}>
                    {Math.floor(currentTime)}:
                    {String(Math.floor((currentTime % 1) * 60)).padStart(2, '0')}
                    {duration > 0 && <span style={{ color: '#ffffff' }}> / {Math.floor(duration)}:00</span>}
                  </div>
                  {!isReady && (
                    <div className='flex items-center space-x-2' style={{ color: '#ffffff' }}>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2' style={{ borderBottomColor: '#ffffff' }}></div>
                      <span className='text-sm font-medium'>Loading tracks...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default BranchPage;
