import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import WaveformCloner from '../components/wave';
import Logo from '../components/Logo';
import {
  Bell,
  Settings,
  Play,
  Pause,
  Volume,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

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
  const [comments, setComments] = useState<string[]>([]);
  const [extraAudio, setExtraAudio] = useState<string>('');
  const [showExtraWaveform, setShowExtraWaveform] = useState(false);

  const wavesurferRefs = useRef<{ [id: string]: WaveSurfer }>({});
  const [readyStates, setReadyStates] = useState<{ [id: string]: boolean }>({});

  // Available audio files in public/audio directory
  const audioFiles = [
    {
      name: 'track_ex.wav',
      path: '/audio/track_ex.wav',
      description: '메인 트랙',
    },
    {
      name: '1.wav',
      path: '/audio/Track_ex/1.wav',
      description: '킥 드럼',
    },
    {
      name: '2.wav',
      path: '/audio/Track_ex/2.wav',
      description: '스네어',
    },
    {
      name: '3.wav',
      path: '/audio/Track_ex/3.wav',
      description: '베이스',
    },
    {
      name: '4.wav',
      path: '/audio/Track_ex/4.wav',
      description: '신스 패드',
    },
    {
      name: '5.wav',
      path: '/audio/Track_ex/5.wav',
      description: '신스 플럭',
    },
    {
      name: '6.wav',
      path: '/audio/Track_ex/6.wav',
      description: '트럼펫',
    },
    {
      name: '7.wav',
      path: '/audio/Track_ex/7.wav',
      description: '보컬 코러스',
    },
    {
      name: '8.wav',
      path: '/audio/Track_ex/8.wav',
      description: '퍼커션 벨',
    },
    {
      name: '9.wav',
      path: '/audio/Track_ex/9.wav',
      description: '사이렌',
    },
  ];

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

  const handleAddComment = useCallback(() => {
    if (!commentInput.trim()) return;
    const time = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`;
    setComments((prev) => [...prev, `🗨️ ${time} - "${commentInput.trim()}"`]);
    setCommentInput('');
    setShowCommentList(true);
  }, [commentInput, currentTime]);

  const handleAudioFileClick = useCallback((audioPath: string) => {
    setExtraAudio(audioPath);
    setShowExtraWaveform(true);
  }, []);

  // Solo 버튼 핸들러들을 메모이제이션
  const handleMainSolo = useCallback(() => handleSolo('main'), [handleSolo]);
  const handleExtraSolo = useCallback(() => handleSolo('extra'), [handleSolo]);

  // currentTime이 변경될 때 extra 파형 동기화
  useEffect(() => {
    const extraPlayer = wavesurferRefs.current['extra'];
    const mainPlayer = wavesurferRefs.current['main'];
    
    if (extraPlayer && mainPlayer && readyStates['extra'] && readyStates['main']) {
      try {
        const progress = currentTime / mainPlayer.getDuration();
        if (progress >= 0 && progress <= 1) {
          extraPlayer.seekTo(progress);
        }
      } catch (error) {
        // 동기화 실패 시 무시
      }
    }
  }, [currentTime, readyStates]);

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
        <button
          onClick={() => setShowHistory(!showHistory)}
          className='rounded bg-[#3a3a3a] px-3 py-1 text-sm hover:bg-[#555]'
        >
          Show History
        </button>
        <button
          onClick={() => setShowCommentList(!showCommentList)}
          className='rounded bg-[#3a3a3a] px-3 py-1 text-sm hover:bg-[#555]'
        >
          Comments
        </button>
      </div>

      {/* Sidebars*/}
      {showHistory && (
        <div className='fixed right-0 top-0 z-40 h-full w-64 bg-[#2a2a2a] px-4 py-6 shadow-lg'>
          {/* Close Button */}
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-bold text-white'>History</h2>
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

          {/* Audio Files List */}
          <div className='mb-6'>
            <h3 className='mb-3 text-sm font-semibold text-white'>
              Available Audio Files
            </h3>
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
                </div>
              ))}
            </div>
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
            {comments.map((comment, idx) => (
              <li key={idx}>{comment}</li>
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
