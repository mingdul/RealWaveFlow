import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import WaveformCloner from '../components/wave';
import Logo from '../components/Logo';  
import streamingService, { StemStreamingInfo } from '../services/streamingService';
import {
  Bell,
  Settings,
  Play,
  Pause,
  Volume,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

// Comment interface
interface Comment {
  id: string;
  time: number;
  text: string;
  timeString: string;
}

// 테스트용 목업 스트리밍 데이터
const mockStreamingData: StemStreamingInfo[] = [
  {
    id: '1',
    fileName: 'Drums - Main Beat',
    category: 'drums',
    tag: 'kick',
    key: 'A minor',
    description: 'Main drum beat with kick and snare',
    presignedUrl: '/audio/Track_ex/1.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '1',
      username: 'SELLY'
    },
    uploadedAt: '2025-01-08T10:30:00Z'
  },
  {
    id: '2',
    fileName: 'Bass - Groove Line',
    category: 'bass',
    tag: 'groove',
    key: 'A minor',
    description: 'Groovy bass line foundation',
    presignedUrl: '/audio/Track_ex/2.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '2',
      username: 'MARCUS'
    },
    uploadedAt: '2025-01-08T10:35:00Z'
  },
  {
    id: '3',
    fileName: 'Guitar - Lead Melody',
    category: 'guitar',
    tag: 'lead',
    key: 'A minor',
    description: 'Lead guitar melody with blues rock feel',
    presignedUrl: '/audio/Track_ex/3.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '3',
      username: 'ALEX'
    },
    uploadedAt: '2025-01-08T10:40:00Z'
  },
  {
    id: '4',
    fileName: 'Synth - Pad Atmosphere',
    category: 'synth',
    tag: 'pad',
    key: 'A minor',
    description: 'Atmospheric synth pad for ambience',
    presignedUrl: '/audio/Track_ex/4.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '4',
      username: 'JENNY'
    },
    uploadedAt: '2025-01-08T10:45:00Z'
  },
  {
    id: '5',
    fileName: 'Vocal - Main Harmony',
    category: 'vocal',
    tag: 'harmony',
    key: 'A minor',
    description: 'Main vocal harmony track',
    presignedUrl: '/audio/Track_ex/5.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '5',
      username: 'SARAH'
    },
    uploadedAt: '2025-01-08T10:50:00Z'
  },
  {
    id: '6',
    fileName: 'Trumpet - Melody',
    category: 'brass',
    tag: 'melody',
    key: 'A minor',
    description: 'Trumpet melody line',
    presignedUrl: '/audio/Track_ex/6.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '6',
      username: 'MIKE'
    },
    uploadedAt: '2025-01-08T10:55:00Z'
  },
  {
    id: '7',
    fileName: 'Vocal - Choir',
    category: 'vocal',
    tag: 'choir',
    key: 'A minor',
    description: 'Background vocal choir',
    presignedUrl: '/audio/Track_ex/7.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '7',
      username: 'LISA'
    },
    uploadedAt: '2025-01-08T11:00:00Z'
  },
  {
    id: '8',
    fileName: 'Percussion - Bell',
    category: 'percussion',
    tag: 'bell',
    key: 'A minor',
    description: 'Percussion bell sounds',
    presignedUrl: '/audio/Track_ex/8.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '8',
      username: 'DAVID'
    },
    uploadedAt: '2025-01-08T11:05:00Z'
  },
  {
    id: '9',
    fileName: 'FX - Police Siren',
    category: 'fx',
    tag: 'siren',
    key: 'A minor',
    description: 'Police siren sound effect',
    presignedUrl: '/audio/Track_ex/9.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '9',
      username: 'ALEX'
    },
    uploadedAt: '2025-01-08T11:10:00Z'
  }
];

const StemSetReviewPage = () => {
  // const wavesurferRef = useRef<any>(null);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soloTrack, setSoloTrack] = useState<'main' | 'extra' | null>('main'); // 초기에는 main만 소리 나게
  const [showHistory, setShowHistory] = useState(false);
  const [showCommentList, setShowCommentList] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [extraAudio, setExtraAudio] = useState<string>('');
  const [showExtraWaveform, setShowExtraWaveform] = useState(false);
  const [useTestData, setUseTestData] = useState(true); // 테스트 모드 토글
  const [streamingStems, setStreamingStems] = useState<StemStreamingInfo[]>([]);
  const [stemsLoading, setStemsLoading] = useState(false);

  const wavesurferRefs = useRef<{ [id: string]: WaveSurfer }>({});
  const [readyStates, setReadyStates] = useState<{ [id: string]: boolean }>({});
  const isSeeking = useRef(false); // 무한 루프 방지용 플래그

  // 스트리밍 데이터 로드
  useEffect(() => {
    const loadStreamingData = async () => {
      if (useTestData) {
        // 테스트 모드: 목업 데이터 사용
        setStemsLoading(true);
        setTimeout(() => {
          setStreamingStems(mockStreamingData);
          setStemsLoading(false);
        }, 1000);
      } else {
        // 실제 API 호출
        setStemsLoading(true);
        try {
          // TODO: 실제 트랙 ID를 사용해야 함
          const response = await streamingService.getTrackStems('sample-track-id');
          if (response.success && response.data) {
            setStreamingStems(response.data.stems);
          }
        } catch (error) {
          console.error('Failed to load streaming data:', error);
          setStreamingStems([]);
        } finally {
          setStemsLoading(false);
        }
      }
    };

    loadStreamingData();
  }, [useTestData]);

  // Legacy audioFiles를 스트리밍 데이터로 변환
  const audioFiles = streamingStems.map((stem) => ({
    name: stem.fileName,
    path: stem.presignedUrl,
    description: stem.description || `${stem.category} - ${stem.tag}`,
    category: stem.category,
    uploadedBy: stem.uploadedBy.username,
    uploadedAt: stem.uploadedAt
  }));

  const handleReady = useCallback((ws: WaveSurfer, id: string) => {
    wavesurferRefs.current[id] = ws;
    
    // ready 상태 업데이트
    setReadyStates(prev => ({ ...prev, [id]: true }));
    
    // main 파형이 ready 되었을 때 이벤트 리스너 추가
    if (id === 'main') {
      ws.on('audioprocess', (time: number) => {
        setCurrentTime(time);
      });
      
      ws.on('ready', () => {
        setDuration(ws.getDuration());
        // 초기 볼륨 설정
        ws.setVolume(soloTrack === 'main' ? 1 : 0);
      });
      
      ws.on('play', () => {
        setIsPlaying(true);
      });
      
      ws.on('pause', () => {
        setIsPlaying(false);
      });
      
      ws.on('finish', () => {
        setIsPlaying(false);
      });
    }
    
    // extra 파형이 ready 되었을 때 볼륨 설정
    if (id === 'extra') {
      ws.on('ready', () => {
        ws.setVolume(soloTrack === 'extra' ? 1 : 0);
      });
    }
  }, [soloTrack]);

  const togglePlay = useCallback(() => {
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];
    
    if (mainPlayer) {
      if (isPlaying) {
        mainPlayer.pause();
        if (extraPlayer) extraPlayer.pause();
      } else {
        mainPlayer.play();
        if (extraPlayer) extraPlayer.play();
      }
    }
  }, [isPlaying]);

  const stopPlayback = useCallback(() => {
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];
    
    if (mainPlayer) {
      mainPlayer.stop();
      if (extraPlayer) extraPlayer.stop();
    }
    setIsPlaying(false);
  }, []);

  const handleSolo = useCallback((trackId: 'main' | 'extra') => {
    setSoloTrack(trackId);
    
    // 볼륨 업데이트
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];
    
    if (mainPlayer) {
      mainPlayer.setVolume(trackId === 'main' ? 1 : 0);
    }
    if (extraPlayer) {
      extraPlayer.setVolume(trackId === 'extra' ? 1 : 0);
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    
    // Solo 트랙에만 볼륨 적용
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];
    
    if (soloTrack === 'main' && mainPlayer) {
      mainPlayer.setVolume(vol);
    } else if (soloTrack === 'extra' && extraPlayer) {
      extraPlayer.setVolume(vol);
    }
  }, [soloTrack]);

  // 댓글 추가 함수
  const handleAddComment = useCallback(() => {
    if (!commentInput.trim()) return;
    
    const timeString = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`;
    const newComment: Comment = {
      id: Date.now().toString(),
      time: currentTime,
      text: commentInput.trim(),
      timeString: timeString
    };
    
    setComments((prev) => [...prev, newComment]);
    setCommentInput('');
    setShowCommentList(true);
    
    // 마커 생성 (얇은 선)
    const ws = wavesurferRefs.current['main'];
    if (ws) {
      // WaveSurfer에 마커 추가 (regions 플러그인 사용)
      try {
        // 마커를 위한 얇은 region 생성
        const container = ws.getWrapper();
        const marker = document.createElement('div');
        marker.style.position = 'absolute';
        marker.style.left = `${(currentTime / duration) * 100}%`;
        marker.style.top = '0';
        marker.style.width = '2px';
        marker.style.height = '100%';
        marker.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        marker.style.pointerEvents = 'none';
        marker.style.zIndex = '10';
        marker.dataset.commentId = newComment.id;
        
        container.appendChild(marker);
      } catch (error) {
        console.warn('마커 생성 실패:', error);
      }
    }
  }, [commentInput, currentTime, duration]);

  // 댓글 클릭 시 해당 시간으로 이동
  const seekToTime = useCallback((time: number) => {
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];
    
    if (mainPlayer && mainPlayer.getDuration()) {
      const progress = time / mainPlayer.getDuration();
      mainPlayer.seekTo(progress);
      
      // extra 파형도 동기화
      if (extraPlayer && extraPlayer.getDuration()) {
        extraPlayer.seekTo(progress);
      }
    }
  }, []);

  const handleSeek = useCallback((time: number, trackId: string) => {
    // 무한 루프 방지
    if (isSeeking.current) return;
    
    isSeeking.current = true;
    setCurrentTime(time);
    
    // 양방향 동기화: 움직인 트랙이 아닌 다른 트랙을 동기화
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];
    
    if (mainPlayer && extraPlayer && readyStates['main'] && readyStates['extra']) {
      try {
        const progress = time / mainPlayer.getDuration();
        if (progress >= 0 && progress <= 1) {
          // main 트랙에서 seek가 발생하면 extra 트랙을 동기화
          if (trackId === 'main' && extraPlayer) {
            extraPlayer.seekTo(progress);
          }
          // extra 트랙에서 seek가 발생하면 main 트랙을 동기화
          else if (trackId === 'extra' && mainPlayer) {
            mainPlayer.seekTo(progress);
          }
        }
      } catch (error) {
        // 동기화 실패 시 무시
      }
    }
    
    // 플래그 초기화
    setTimeout(() => {
      isSeeking.current = false;
    }, 100);
  }, [readyStates]);

  const handleAudioFileClick = useCallback((audioPath: string) => {
    setExtraAudio(audioPath);
    setShowExtraWaveform(true);
  }, []);

  const toggleTestMode = () => {
    setUseTestData(!useTestData);
  };

  // Solo 버튼 핸들러들을 메모이제이션
  const handleMainSolo = useCallback(() => handleSolo('main'), [handleSolo]);
  const handleExtraSolo = useCallback(() => handleSolo('extra'), [handleSolo]);

  // audioprocess 이벤트를 통한 재생 중 동기화 (main -> extra만)
  useEffect(() => {
    const extraPlayer = wavesurferRefs.current['extra'];
    const mainPlayer = wavesurferRefs.current['main'];
    
    // 재생 중일 때만 audioprocess 이벤트를 통한 동기화 수행
    if (isPlaying && extraPlayer && mainPlayer && readyStates['extra'] && readyStates['main']) {
      try {
        const progress = currentTime / mainPlayer.getDuration();
        if (progress >= 0 && progress <= 1) {
          extraPlayer.seekTo(progress);
        }
      } catch (error) {
        // 동기화 실패 시 무시
      }
    }
  }, [currentTime, readyStates, isPlaying]);

  return (
    <div className='relative min-h-screen space-y-6 overflow-hidden bg-[#1e1e1e] px-6 py-8 text-white'>
      {/* Header */}
      <div className='border-b border-[#595959] bg-[#262626] px-6 py-4'>
        <div className='flex items-center justify-between'>
          {/* 로고 */}
          <div className='flex items-center space-x-4'>
            <div className='flex items-center space-x-2'>
              <Logo />
            </div>
          </div>

          {/* 탭 버튼 */}
          <div className='flex items-center space-x-3'>
            <button className='text-gray-300 transition-colors hover:text-white'>
              TRACK
            </button>
            <button className='border-b-2 border-white pb-1 text-white'>
              STAGE
            </button>
          </div>

          {/* 알림/설정 버튼 가로 정렬 */}
          <div className='flex items-center gap-4'>
            <button className='relative text-white transition-colors hover:text-gray-300'>
              <Bell size={20} />
              <span className='absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white'>
                1
              </span>
            </button>
            <button className='text-white transition-colors hover:text-gray-300'>
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 🔽 Header 아래로 이동된 버튼들 */}
      <div className='z-50 flex flex-col gap-2 px-6 pt-4'>
        {/* 테스트 모드 토글 버튼 */}
        <button
          onClick={toggleTestMode}
          className={`self-start rounded px-4 py-2 text-sm font-medium transition-colors ${
            useTestData 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-600 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {useTestData ? '스트리밍 테스트 모드 ON' : '스트리밍 테스트 모드 OFF'}
        </button>
        
        <button
          onClick={() => setShowHistory(!showHistory)}
          className='self-start rounded bg-[#3a3a3a] px-3 py-1 text-sm hover:bg-[#555]'
        >
          Show History
        </button>
        <button
          onClick={() => setShowCommentList(!showCommentList)}
          className='self-start rounded bg-[#3a3a3a] px-3 py-1 text-sm hover:bg-[#555]'
        >
          Comments
        </button>
      </div>

      {/* Sidebars*/}
      {showHistory && (
        <div className='fixed right-0 top-0 z-40 h-full w-64 bg-[#2a2a2a] px-4 py-6 shadow-lg'>
          {/* Close Button */}
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-bold text-white'>Streaming Audio Files</h2>
            <button
              onClick={() => setShowHistory(false)}
              className='rounded-full p-1 text-gray-300 transition-all duration-200 hover:text-white'
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#ffffff')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
            >
              <svg
                className='h-5 w-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>

          {/* Streaming Status */}
          <div className='mb-4'>
            <div className={`inline-block rounded px-2 py-1 text-xs ${
              useTestData ? 'bg-green-800 text-green-200' : 'bg-blue-800 text-blue-200'
            }`}>
              {useTestData ? 'Test Mode' : 'Live Streaming'}
            </div>
          </div>

          {/* Audio Files List */}
          <div className='mb-6'>
            <h3 className='mb-3 text-sm font-semibold text-white'>
              Available Stem Files
            </h3>
            {stemsLoading ? (
              <div className='flex justify-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
              </div>
            ) : (
              <div className='max-h-96 space-y-2 overflow-y-auto'>
                {audioFiles.map((file, index) => (
                  <div
                    key={index}
                    onClick={() => handleAudioFileClick(file.path)}
                    className='cursor-pointer rounded bg-[#3a3a3a] p-3 text-sm text-white transition-colors hover:bg-[#4a4a4a]'
                  >
                    <div className='font-medium'>{file.name}</div>
                    <div className='text-xs text-gray-400'>
                      {file.description}
                    </div>
                    <div className='text-xs text-gray-500 mt-1'>
                      Category: {file.category} | By: {file.uploadedBy}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showCommentList && (
        <div className='fixed right-0 top-0 z-40 h-full w-64 bg-[#2a2a2a] px-4 py-6 shadow-lg'>
          {/* Close Button */}
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-bold text-white'>Comments</h2>
            <button
              onClick={() => setShowCommentList(false)}
              className='rounded-full p-1 text-gray-300 transition-all duration-200 hover:text-white'
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#ffffff')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
            >
              <svg
                className='h-5 w-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
          <ul className='space-y-2 text-sm text-white'>
            {comments.map((comment) => (
              <li 
                key={comment.id}
                className='cursor-pointer hover:bg-[#3a3a3a] p-2 rounded'
                onClick={() => seekToTime(comment.time)}
              >
                <div className='flex items-center space-x-2'>
                  <span className='text-blue-400 font-mono'>{comment.timeString}</span>
                  <span>🗨️</span>
                </div>
                <div className='text-gray-300 ml-6'>{comment.text}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Waveform */}
      <div className='space-y-6'>
        <WaveformCloner
          onReady={handleReady}
          audioUrl='/audio/track_ex.wav'
          waveColor='#f87171'
          id='main'
          isPlaying={isPlaying}
          currentTime={currentTime}
          onSolo={handleMainSolo}
          isSolo={soloTrack === 'main'}
          onSeek={handleSeek}
        />

        {showExtraWaveform && extraAudio && (
          <WaveformCloner
            onReady={handleReady}
            audioUrl={extraAudio}
            waveColor='#60a5fa'
            id='extra'
            isPlaying={isPlaying}
            currentTime={currentTime}
            onSolo={handleExtraSolo}
            isSolo={soloTrack === 'extra'}
            onSeek={handleSeek}
          />
        )}
      </div>

      {/* Control Bar */}
      <div className='flex items-center rounded bg-[#2b2b2b] px-6 py-3 text-sm shadow'>
        <button
          onClick={stopPlayback}
          className='ml-6 text-white hover:text-gray-300'
        >
          <Pause size={20} />
        </button>
        <button
          onClick={togglePlay}
          className='ml-3 text-white hover:text-gray-300'
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className='ml-2 text-white hover:text-gray-300'>
          <svg viewBox='0 0 16 16' height='16'>
            <use xlinkHref='#repeatall' />
          </svg>
        </button>
        <div className='ml-4 flex items-center'>
          <span className='material-icons mr-2 text-white'>
            <Volume size={20} />
          </span>
          <input
            type='range'
            min='0'
            max='1'
            step='0.01'
            value={volume}
            onChange={handleVolumeChange}
            className='w-24 accent-blue-500'
          />
        </div>
        <div className='ml-5 text-white'>
          <span>
            {Math.floor(currentTime / 60)}:
            {String(Math.floor(currentTime % 60)).padStart(2, '0')} /{' '}
            {Math.floor(duration / 60)}:
            {String(Math.floor(duration % 60)).padStart(2, '0')}
          </span>
        </div>
        <div className='ml-auto mr-5'>
          <button className='rounded bg-[#3a3a3a] px-3 py-1 text-sm hover:bg-[#4a4a4a]'>
            1x
          </button>
        </div>
        <button className='material-icons mr-3 text-white hover:text-gray-300'>
          <ZoomIn size={20} />
        </button>
        <button className='material-icons mr-5 text-white hover:text-gray-300'>
          <ZoomOut size={20} />
        </button>
      </div>

      {/* Comment Input */}
      <div className='flex justify-center'>
        <div className='flex w-full max-w-3xl items-center gap-3 rounded-md bg-[#2c2c2c] px-4 py-3 shadow'>
          <span className='rounded bg-gray-700 px-2 py-1 text-sm'>
            {String(Math.floor(currentTime / 60)).padStart(2, '0')}:
            {String(Math.floor(currentTime % 60)).padStart(2, '0')}
          </span>
          <input
            type='checkbox'
            checked
            className='accent-green-500'
            readOnly
          />
          <span className='rounded bg-gray-600 px-2 py-1 text-xs text-white'>
            장
          </span>
          <input
            type='text'
            placeholder='Leave your comment...'
            className='flex-1 bg-transparent text-white placeholder-gray-400 outline-none'
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
          />
          <button
            className='text-gray-400 hover:text-white'
            onClick={handleAddComment}
          >
            ▶️
          </button>
        </div>
      </div>
    </div>
  );
};

export default StemSetReviewPage;                 
