import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Download,
  Headphones,
  // Settings,
  Square,
  VolumeX,
  ChevronsRight,
  Volume2,
  ChevronDown,
  History,
} from 'lucide-react';
import Multitrack from 'wavesurfer-multitrack';
import Logo from '../components/Logo.tsx';
// import { CollaboratePanel } from '../components';
import { useLocation, useNavigate } from 'react-router-dom';
import MasterTakeService from '../services/masterTakeService.ts';
import InviteService from '../services/inviteService.ts';
import StreamingService from '../services/streamingService';
import SessionService from '../services/sessionService.ts';

interface Track {
  id: string;
  name: string;
  type: string;
  color: string;
  audioUrl: string;
  peaksUrl: string;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
}

interface Session {
  id: string;
  name: string;
}

// const audioFiles: string[] = [];

const colorMap: Record<string, string> = {
  'bg-gray-darkest': '#0D0D0D',
  'bg-gray-dark': '#262626',
  'bg-gray-medium': '#595959',
  'bg-gray-light': '#BFBFBF',
  'bg-gray-lightest': '#D9D9D9',
};

const timeMarkers = Array.from({ length: 9 }, (_, i) => i);

const MasterPage: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(0);
  const [soloTrackId, setSoloTrackId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const multitrackRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const navigate = useNavigate();

  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [masterTakes, setMasterTakes] = useState<any[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);

  const [loadedTracks, setLoadedTracks] = useState<Set<string>>(new Set());
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sessionDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize containerRefs with the correct length
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const trackId = queryParams.get('trackId');

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sessionDropdownRef.current &&
        !sessionDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSessionDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Session 목록 가져오기
  useEffect(() => {
    const fetchSessions = async () => {
      if (!trackId) return;

      try {
        const response = await SessionService.getSessionsByTrack(trackId);
        setSessions(response.data || []);
      } catch (error) {
        console.error('Session 목록 불러오기 실패:', error);
      }
    };

    fetchSessions();
  }, [trackId]);

  // peaks 데이터 로드 함수
  const loadPeaksData = async (peakFile: string) => {
    try {
      console.log('Loading peaks data from:', peakFile);
      const response = await fetch(peakFile);
      const peaksData = await response.json();
      console.log('Successfully loaded peaks data:', peaksData);
      return peaksData.peaks;
    } catch (error) {
      console.error('Error loading peaks data:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchStems = async () => {
      if (!trackId) return;

      try {
        console.log('Fetching master stems for trackId:', trackId, 'take:', selectedVersion);
        
        // 기존 MasterStemService 대신 StreamingService의 getMasterStemStreams 사용
        const streamingResponse = await StreamingService.getMasterStemStreams(
          trackId,
          selectedVersion
        );

        console.log('StreamingService response:', streamingResponse);
        console.log('StreamingService response (stringified):', JSON.stringify(streamingResponse, null, 2));

        if (streamingResponse.success && streamingResponse.data) {
          const stems = streamingResponse.data.stems;
          console.log('Stems data:', stems);
          console.log('Stems data (stringified):', JSON.stringify(stems, null, 2));
          
          if (!stems || !Array.isArray(stems)) {
            console.error('Stems is not an array or is undefined:', stems);
            return;
          }

          const newTracks = stems.map((stem: any, index: number) => {
            console.log(`Processing stem ${index}:`, stem);
            console.log(`Processing stem ${index} (stringified):`, JSON.stringify(stem, null, 2));
            
            // stem 객체의 구조 확인
            if (!stem) {
              console.error(`Stem at index ${index} is undefined or null`);
              return null;
            }

            const trackData = {
              id: stem.id || stem.stemId || `stem-${index}`,
              name: stem.fileName || stem.name || `Track ${index + 1}`,
              type: 'master',
              color: Object.keys(colorMap)[index % Object.keys(colorMap).length],
              audioUrl: stem.presignedUrl || stem.url || '', // presignedUrl을 audioUrl로 사용
              // peaksUrl: stem.peaksUrl || '/peaks/111.json', // peaks URL이 있다면 사용, 없으면 기본값
              // 임시로 3개의 JSON 파일 순환 사용
              peaksUrl: [
                '/peaks/Clap.wav_waveform_563601bb.json',          // 1번 트랙
                '/peaks/fx_reverserise.wav_waveform_54e48434.json',  // 2번 트랙
                '/peaks/guitar pluck.wav_waveform_7c5e565f.json', // 3번 트랙
              ][index % 3],
              isPlaying: false,
              isMuted: false,
              volume: 1,
            };
            
            console.log(`Created track data for stem ${index}:`, trackData);
            return trackData;
          }).filter(track => track !== null); // null 값 제거

          console.log('Final tracks array:', newTracks);
          setTracks(newTracks);
        } else {
          console.error(
            '마스터 스템 스트리밍 URL 불러오기 실패:',
            streamingResponse.message || 'Unknown error'
          );
          console.error('Full response:', streamingResponse);
          console.error('Full response (stringified):', JSON.stringify(streamingResponse, null, 2));
        }
      } catch (e: any) {
        console.error('master stem 불러오기 실패', e);
        console.error('Error details:', {
          message: e.message,
          stack: e.stack,
          trackId,
          selectedVersion
        });
      }

      try {
        console.log('Fetching master takes for trackId:', trackId);
        const takeResponse = await MasterTakeService.getMasterTakeByTrackId(trackId);
        console.log('Master takes response:', takeResponse);
        setMasterTakes(takeResponse.data || []);
      } catch (e: any) {
        console.error('take 불러오기 실패', e);
        console.error('Take error details:', {
          message: e.message,
          stack: e.stack,
          trackId
        });
      }
    };

    fetchStems();
  }, [trackId, selectedVersion]);
  // Handle audio file loading
  useEffect(() => {
    const loadedFiles = new Set<string>();
    let loadingPromises = tracks.map((track) => {
      return new Promise<void>((resolve, reject) => {
        const audio = new Audio();
        audio.src = track.audioUrl;

        audio.addEventListener('loadeddata', () => {
          loadedFiles.add(track.id);
          setLoadedTracks((prev) => new Set([...prev, track.id]));
          resolve();
        });

        audio.addEventListener('error', (e) => {
          console.error(`Error loading audio file for ${track.name}:`, e);
          reject(e);
        });
      });
    });

    Promise.all(loadingPromises).catch((error) => {
      console.error('Error loading audio files:', error);
    });

    return () => {
      setLoadedTracks(new Set());
    };
  }, [tracks]);
  // Initialize Multitrack when containers are ready
  useEffect(() => {
    if (!containerRef.current || tracks.length === 0) return;

    const initializeMultitrack = async () => {
      console.log('Starting multitrack initialization...');

      // Load peaks data for each track
      const peaksDataPromises = tracks.map((track) =>
        loadPeaksData(track.peaksUrl)
      );
      const peaksDataResults = await Promise.all(peaksDataPromises);
      console.log('All peaks data loaded:', peaksDataResults);

      // Convert tracks to multitrack format
      const multitrackTracks = tracks.map((track, index) => {
        const trackPeaks = peaksDataResults[index];
        console.log(`Creating track ${index + 1} with peaks data:`, trackPeaks);

        return {
          id: index + 1,
          url: track.audioUrl,
          peaks: trackPeaks,
          startPosition: 0,
          volume: track.volume,
          draggable: false,
          options: {
            waveColor: '#1F6EEB ',
            progressColor: '#ffffff',
            height: 113,
            normalize: true,
            barWidth: 2,
            barGap: 1,
          },
        };
      });

      const container = containerRef.current;
      if (!container) return;

      console.log('Creating multitrack with tracks:', multitrackTracks);

      // Create multitrack instance with type assertion
      multitrackRef.current = Multitrack.create(multitrackTracks as any, {
        container,
        minPxPerSec: 100,
        cursorColor: '#ffffff',
        cursorWidth: 2,
        trackBackground: '#374151',
        trackBorderColor: '#4B5563',
      });

      // Set up event listeners
      multitrackRef.current.once('canplay', () => {
        setIsReady(true);
        console.log('Multitrack is ready to play');
      });

      multitrackRef.current.on('loading', (percent: number) => {
        console.log('Loading audio:', percent + '%');
      });

      multitrackRef.current.on('ready', () => {
        console.log('Audio is loaded and ready');
        setIsAudioLoaded(true);
      });

      multitrackRef.current.on('error', (error: any) => {
        console.error('Multitrack error:', error);
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
      multitrackRef.current?.destroy();
    };
  }, [loadedTracks]);

  const togglePlay = () => {
    if (!multitrackRef.current || !isReady) return;

    console.log('Toggle play clicked');

    if (multitrackRef.current.isPlaying()) {
      console.log('Pausing playback');
      multitrackRef.current.pause();
    } else {
      console.log('Starting playback');
      if (!isAudioLoaded) {
        console.log('Loading audio files before playing...');
        try {
          // Multitrack에서 직접 play()를 호출하면 자동으로 오디오를 로드합니다
          multitrackRef.current.play();
          setIsAudioLoaded(true);
        } catch (error) {
          console.error('Error starting playback:', error);
        }
      } else {
        multitrackRef.current.play();
      }
    }
  };

  const toggleTrackMute = (trackId: string) => {
    const trackIndex = tracks.findIndex((track) => track.id === trackId);
    if (trackIndex === -1 || !multitrackRef.current) return;

    const track = tracks[trackIndex];
    const newMuted = !track.isMuted;

    // 멀티트랙 볼륨 업데이트 (뮤트 0, 뮤트 해제 원래 볼륨)
    multitrackRef.current.setTrackVolume(
      trackIndex,
      newMuted ? 0 : track.volume
    );

    // Update state
    setTracks((prevTracks) =>
      prevTracks.map((track) =>
        track.id === trackId ? { ...track, isMuted: newMuted } : track
      )
    );
  };

  const toggleTrackSolo = (trackId: string) => {
    const trackIndex = tracks.findIndex((track) => track.id === trackId);
    if (trackIndex === -1 || !multitrackRef.current) return;

    if (soloTrackId === trackId) {
      // 솔로 트랙 해제 - 모든 트랙 원래 볼륨으로 복구
      setSoloTrackId(null);
      tracks.forEach((track, index) => {
        const volume = track.isMuted ? 0 : track.volume;
        multitrackRef.current.setTrackVolume(index, volume);
      });
    } else {
      // 솔로 트랙 설정 - 나머지 트랙 뮤트
      setSoloTrackId(trackId);
      tracks.forEach((track, index) => {
        if (index === trackIndex) {
          // Keep this track's volume or mute if it's muted
          const volume = track.isMuted ? 0 : track.volume;
          multitrackRef.current.setTrackVolume(index, volume);
        } else {
          // 나머지 트랙 뮤트
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

  // const handleBranchClick = () => {
  //   navigate(`/branch?projectId=${trackId}`);
  // };

  const handleSessionSelect = (sessionId: string) => {
    navigate(`/branch?projectId=${trackId}&sessionId=${sessionId}`);
    setIsSessionDropdownOpen(false);
  };

  const handleCollaborateClick = async () => {
    if (!trackId) return;
    try {
      const invite = await InviteService.createInviteLink(trackId);
      console.log('invite link Link', invite);
      const token = invite.token;
      const fullUrl = `${window.location.origin}/invite/${token}`; // or 실제 배포 주소
      setInviteUrl(fullUrl);
      setIsPanelOpen(true);
    } catch (e) {
      console.error('초대 링크 생성 실패', e);
    }
  };

  const handleCopyInviteUrl = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  const handleDropHistoryClick = () => {
    console.log('=== Drop History Button Clicked ===');
    console.log('trackId:', trackId);
    if (trackId) {
      const targetRoute = `/master/${trackId}/drop-history`;
      console.log('Navigating to:', targetRoute);
      navigate(targetRoute);
    } else {
      console.warn('trackId is missing - cannot navigate to drop history');
    }
  };

  return (
    <div
      className='flex h-screen w-screen flex-col text-[#D9D9D9]'
      style={{ backgroundColor: '#0D0D0D' }}
    >
      {/* Header */}
      <div className='flex-shrink-0'>
        <div className='px-6 py-4' style={{ backgroundColor: '#262626' }}>
          <div className='flex items-center justify-between'>
            {/* Logo */}
            <div className='flex items-center space-x-4'>
              <div className='flex items-center space-x-2'>
                <div>
                  <Logo />
                </div>
              </div>
            </div>
            <div className='flex items-center space-x-4'></div>

             {/* Tabs */}
             <div className='flex items-center space-x-4'>
              <div className='relative'>
                <button
                  className='flex items-center space-x-2 rounded bg-[#D9D9D9] px-6 py-2 hover:bg-[#BFBFBF] text-[#0D0D0D]'
                  onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}
                >
                  <span>Session</span>
                  <ChevronDown className='h-4 w-4' />
                </button>
                {isSessionDropdownOpen && (
                  <div 
                    ref={sessionDropdownRef}
                    className='absolute right-0 top-full mt-2 w-48 bg-[#D9D9D9] shadow-xl border border-[#595959] rounded-lg z-50'
                  >
                    <div className='py-2'>
                      {sessions.length > 0 ? (
                        sessions.map((session) => (
                          <button
                            key={session.id}
                            className='w-full text-left px-4 py-2 text-[#0D0D0D] hover:bg-[#BFBFBF]'
                            onClick={() => handleSessionSelect(session.id)}
                          >
                            {session.name}
                          </button>
                        ))
                      ) : (
                        <div className='px-4 py-2 text-[#595959] text-sm'>
                          세션이 없습니다
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button className='rounded bg-[#FA576A] px-6 py-2 hover:bg-[#D60017]' onClick={handleDropHistoryClick}>
                Drop History
              </button>
              {/* 트랙 협업 공유 */}
              <button className='rounded bg-[#D9D9D9] px-6 py-2 hover:bg-[#BFBFBF] text-[#0D0D0D]' onClick={handleCollaborateClick}>
                Collaborate
              </button>
              {isPanelOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white shadow-xl border rounded-lg p-4 z-50">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-black">트랙 협업 공유</h2>
                    <button onClick={handleClosePanel} className="text-black">✕</button>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">공유 링크</p>
                    <button
                      className="w-full border rounded px-2 py-1 flex items-center gap-2 text-black"
                      onClick={handleCopyInviteUrl}
                    >
                      {inviteUrl || '링크를 불러오는 중...'}
                    </button>
                  </div>
                  <button

                    onClick={handleCopyInviteUrl}
                    className="w-full bg-[#FA576A] text-white py-2 rounded font-semibold mb-4"
                  >
                    🔗 링크 복사
                  </button>
                </div>
              )} 
                            
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Left Sidebar */}
        <div
          className='flex w-64 flex-shrink-0 flex-col border-r'
          style={{ backgroundColor: '#1a1a1a', borderRightColor: '#333333' }}
        >
          {/* Version Selector */}
          <div className='space-y-2 p-4'>
            {masterTakes.map((take) => (
              <button
                key={take.id}
                className={`w-full border p-3 text-left font-medium transition-all duration-200 hover:shadow-lg ${selectedVersion === take.take ? 'text-white' : 'text-gray-200'}`}
                style={{
                  backgroundColor: selectedVersion === take.take ? '#333333' : '#000000',
                  borderColor: selectedVersion === take.take ? '#ffffff' : '#333333',
                }}
                onMouseEnter={(e) => {
                  if (selectedVersion !== take.take) {
                    e.currentTarget.style.backgroundColor = '#333333';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedVersion !== take.take) {
                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                  }
                }}
                onClick={() => setSelectedVersion(take.take)}
              >
                TAKE {take.take}
              </button>
            ))}
          </div>
        </div>

        {/* Track Area */}
        <div className='flex flex-1 flex-col'>
          <div
            className='flex-1 overflow-y-auto'
            style={{ backgroundColor: '#0a0a0a' }}
          >
            <div className='p-6'>
              {/* Time Markers */}
              <div className='mb-4 ml-80 flex justify-between px-4 text-sm'>
                {timeMarkers.map((marker) => (
                  <div key={marker} className='flex flex-col items-center'>
                    <div
                      className='mb-1 h-2 w-px'
                      style={{ backgroundColor: '#404040' }}
                    ></div>
                    <span className='text-gray-400'>{marker}</span>
                  </div>
                ))}
              </div>

              {/* Track Container */}
              <div className='relative'>
                <div className='space-y-1'>
                  {tracks.map((track, trackIndex) => (
                    <div
                      key={track.id}
                      className='overflow-hidden rounded-lg border shadow-lg transition-shadow hover:shadow-xl'
                      style={{
                        backgroundColor: '#1760BF',
                        borderColor: '#3D9DF2',
                      }}
                    >
                      <div className='flex items-center'>
                        {/* Track Controls */}
                        <div className='w-80 p-4'>
                          <div className='flex items-center space-x-3'>
                            <button
                              onClick={() => togglePlay()}
                              disabled={!isReady}
                              className={`rounded-full p-2 transition-colors ${
                                isPlaying ? 'text-white' : 'text-gray-300'
                              } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                              style={{
                                backgroundColor: isPlaying
                                  ? '#52C5F2'
                                  : '#3D9DF2',
                              }}
                              onMouseEnter={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor =
                                    '#52C5F2';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor =
                                    isPlaying ? '#52C5F2' : '#3D9DF2';
                                }
                              }}
                            >
                              {isPlaying ? (
                                <Pause className='h-4 w-4' />
                              ) : (
                                <Play className='h-4 w-4' />
                              )}
                            </button>
                            <button
                              className='rounded-full p-2 text-gray-300 transition-colors'
                              style={{ backgroundColor: '#3D9DF2' }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  '#52C5F2')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  '#3D9DF2')
                              }
                            >
                              <Download className='h-4 w-4' />
                            </button>
                            <button
                              onClick={handleDropHistoryClick}
                              className='rounded-full p-2 text-gray-300 transition-colors'
                              style={{ backgroundColor: '#3D9DF2' }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  '#52C5F2')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  '#3D9DF2')
                              }
                              title='Drop History'
                            >
                              <History className='h-4 w-4' />
                            </button>

                            <div className='flex-1'>
                              <div className='text-sm font-medium text-white'>
                                {track.name}
                              </div>
                              <div
                                className='text-xs capitalize'
                                style={{ color: '#52C5F2' }}
                              >
                                {track.type} 
                                {/* -{' '}
                                {track.name.includes('Master')
                                  ? 'Original'
                                  : 'Modified'} */}
                              </div>
                            </div>
                            <button
                              onClick={() => toggleTrackSolo(track.id)}
                              disabled={!isReady}
                              className={`rounded-full p-2 transition-colors ${
                                soloTrackId === track.id
                                  ? 'text-white'
                                  : 'text-gray-300'
                              } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                              style={{
                                backgroundColor:
                                  soloTrackId === track.id
                                    ? '#0726D9'
                                    : '#3D9DF2',
                              }}
                              onMouseEnter={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor =
                                    soloTrackId === track.id
                                      ? '#52C5F2'
                                      : '#52C5F2';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor =
                                    soloTrackId === track.id
                                      ? '#0726D9'
                                      : '#3D9DF2';
                                }
                              }}
                            >
                              <Headphones className='h-4 w-4' />
                            </button>

                            <button
                              type='button'
                              onClick={() => toggleTrackMute(track.id)}
                              disabled={!isReady}
                              className={`rounded-full p-2 transition-colors ${
                                track.isMuted ? 'text-white' : 'text-gray-300'
                              } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                              style={{
                                backgroundColor: track.isMuted
                                  ? '#dc2626'
                                  : '#3D9DF2',
                              }}
                              onMouseEnter={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor =
                                    track.isMuted ? '#ef4444' : '#52C5F2';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isReady) {
                                  e.currentTarget.style.backgroundColor =
                                    track.isMuted ? '#dc2626' : '#3D9DF2';
                                }
                              }}
                            >
                              {track.isMuted ? (
                                <VolumeX className='h-4 w-4' />
                              ) : (
                                <Volume2 className='h-4 w-4' />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Waveform Placeholder */}
                        <div className='relative flex-1'>
                          <div
                            ref={(el) => {
                              containerRefs.current[trackIndex] = el;
                            }}
                            className={`relative h-[110px] w-full border-l-4`}
                            style={{
                              backgroundColor: 'rgba(61, 157, 242, 0.1)',
                              borderLeftColor: '#3D9DF2',
                            }}
                            data-track-id={track.id}
                          >
                            {!isReady && (
                              <div className='absolute inset-0 flex items-center justify-center'>
                                <div
                                  className='text-sm'
                                  style={{ color: '#52C5F2' }}
                                >
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

                {/* Multitrack container */}
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
          <div
            className='flex-shrink-0 border-t px-6 py-4'
            style={{ backgroundColor: '#000000', borderTopColor: '#ffffff' }}
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-4'>
                <button
                  onClick={togglePlay}
                  disabled={!isReady}
                  className={`rounded-full p-3 transition-colors ${
                    isPlaying ? 'text-white' : 'text-white'
                  } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={{
                    backgroundColor: isPlaying ? '#ffffff' : '#000000',
                    color: isPlaying ? '#000000' : '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    if (isReady) {
                      e.currentTarget.style.backgroundColor = isPlaying
                        ? '#ffffff'
                        : '#555555';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isReady) {
                      e.currentTarget.style.backgroundColor = isPlaying
                        ? '#ffffff'
                        : '#404040';
                    }
                  }}
                >
                  {isPlaying ? (
                    <Square className='h-6 w-6' />
                  ) : (
                    <Play className='h-6 w-6' />
                  )}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    if (multitrackRef.current && isReady) {
                      multitrackRef.current.setTime(0);
                    }
                  }}
                  disabled={!isReady}
                  className={`rounded-lg p-2 text-gray-300 transition-colors ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={{ backgroundColor: '#3D9DF2' }}
                  onMouseEnter={(e) => {
                    if (isReady) {
                      e.currentTarget.style.backgroundColor = '#52C5F2';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isReady) {
                      e.currentTarget.style.backgroundColor = '#3D9DF2';
                    }
                  }}
                >
                  <Square className='h-5 w-5' />
                </button>
                <button
                  type='button'
                  onClick={() => {
                    if (multitrackRef.current && isReady) {
                      multitrackRef.current.setTime(
                        multitrackRef.current.getCurrentTime() + 10
                      );
                    }
                  }}
                  disabled={!isReady}
                  className={`rounded-lg p-2 text-gray-300 transition-colors ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={{ backgroundColor: '#3D9DF2' }}
                  onMouseEnter={(e) => {
                    if (isReady) {
                      e.currentTarget.style.backgroundColor = '#52C5F2';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isReady) {
                      e.currentTarget.style.backgroundColor = '#3D9DF2';
                    }
                  }}
                >
                  <ChevronsRight className='h-5 w-5' />
                </button>
              </div>
              <div className='flex items-center space-x-4'>
                <div
                  className='rounded-lg px-3 py-1 text-sm'
                  style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}
                >
                  {Math.floor(currentTime)}:
                  {String(Math.floor((currentTime % 1) * 60)).padStart(2, '0')}
                  {duration > 0 && (
                    <span className='text-gray-400'>
                      {' '}
                      / {Math.floor(duration)}:00
                    </span>
                  )}
                </div>
                {!isReady && (
                  <div className='text-sm text-gray-400'>Loading...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterPage;
