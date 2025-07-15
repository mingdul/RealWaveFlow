import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Wave from '../components/wave';
import Logo from '../components/Logo';  
import { getStageUpstreams, getUpstreamStems } from '../services/upstreamService';
import { getStageDetail, getStageByTrackIdAndVersion } from '../services/stageService';
import streamingService from '../services/streamingService';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  createUpstreamComment,
  getUpstreamComments,
  deleteUpstreamComment,
  updateUpstreamComment
} from '../services/upstreamCommentService';
import {
  Bell,
  Settings,
  Play,
  Pause,
  Volume,
  ZoomIn,
  ZoomOut,
  Trash2,
  Edit2,
} from 'lucide-react';

// Comment interface updated to match backend response
interface Comment {
  id: string;
  time: string;
  comment: string;
  timeNumber: number; // for seek functionality
  timeString: string; // formatted time display
  user?: {
    id: string;
    username: string;
  };
}

const StemSetReviewPage = () => {
  const { user } = useAuth();
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
  const [selectedUpstream, setSelectedUpstream] = useState<any>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [extraAudio, setExtraAudio] = useState<string>('');
  const [showExtraWaveform, setShowExtraWaveform] = useState(false);
  const [stemsLoading] = useState(false);
  const [upstreams, setUpstreams] = useState<any[]>([]);
  const [upstreamStems, setUpstreamStems] = useState<any[]>([]);
  const [guideAudioUrl, setGuideAudioUrl] = useState<string>('');
  const [guideLoading, setGuideLoading] = useState(false);
  const [trackId, setTrackId] = useState<string>('');

  const wavesurferRefs = useRef<{ [id: string]: WaveSurfer }>({});
  const [readyStates, setReadyStates] = useState<{ [id: string]: boolean }>({});
  const isSeeking = useRef(false); // 무한 루프 방지용 플래그
  const {stageId} = useParams<{stageId: string}>();

  // 이전 버전의 가이드 스템 URL 가져오기
  useEffect(() => {
    const fetchPreviousGuideUrl = async () => {
      if (!stageId) return;
      
      try {
        setGuideLoading(true);
        
        // 1. 현재 스테이지 정보 가져오기
        const currentStage = await getStageDetail(stageId);
        if (!currentStage) {
          console.error('Current stage not found');
          return;
        }
        
        const { track, version } = currentStage;
        const trackId = track.id;
        const currentVersion = version;
        
        // 2. 이전 버전이 있는지 확인
        if (currentVersion <= 1) {
          console.log('No previous version available');
          return;
        }
        
        // 3. 이전 버전의 스테이지 정보 가져오기
        const previousStage = await getStageByTrackIdAndVersion(trackId, currentVersion - 1);
        if (!previousStage) {
          console.error('Previous stage not found');
          return;
        }
        
        // 4. 이전 스테이지의 guide_path 확인
        const guidePath = previousStage.guide_path;
        if (!guidePath) {
          console.log('No guide path in previous stage');
          return;
        }
        
        // 5. guide_path를 presigned URL로 변환
        const response = await streamingService.getGuidePresignedUrl(guidePath, trackId);
        if (response.success && response.data) {
          setGuideAudioUrl(response.data.presignedUrl);
        }
        
      } catch (error) {
        console.error('Failed to fetch previous guide URL:', error);
      } finally {
        setGuideLoading(false);
      }
    };

    fetchPreviousGuideUrl();
  }, [stageId]);

  useEffect(() => {
    const fetchUpstreamsAndStems = async () => {
      try {
        // 1. 먼저 stage 정보를 가져와서 trackId 획득
        const stageResponse = await getStageDetail(stageId || '');
        if (!stageResponse || !stageResponse.track) {
          console.error('Failed to get stage details');
          return;
        }
        
        const currentTrackId = stageResponse.track.id;
        setTrackId(currentTrackId);
        
        // 2. upstream 목록 가져오기
        const upstreamsResponse = await getStageUpstreams(stageId || '');
        if (!upstreamsResponse.data) {
          console.error('Failed to get upstreams');
          return;
        }
        
        setUpstreams(upstreamsResponse.data);
        
        // 3. 각 upstream에 대해 stem 정보 가져오기
        const stemPromises = upstreamsResponse.data.map(async (upstream: any) => {
          try {
            const stemResponse = await getUpstreamStems(upstream.id, currentTrackId);
            return {
              upstreamId: upstream.id,
              stemData: stemResponse.data || null
            };
          } catch (error) {
            console.error(`Failed to fetch stems for upstream ${upstream.id}:`, error);
            return {
              upstreamId: upstream.id,
              stemData: null
            };
          }
        });
        
        const stemsResults = await Promise.all(stemPromises);
        setUpstreamStems(stemsResults);
        
      } catch (error) {
        console.error('Failed to fetch upstreams and stems', error);
      }
    };
  
    if (stageId) fetchUpstreamsAndStems();
  }, [stageId]);

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
  const handleAddComment = useCallback(async () => {
    if (!commentInput.trim() || !selectedUpstream || !user) return;
    
    const timeString = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`;
    
    try {
      const commentData = {
        comment: commentInput.trim(),
        time: timeString,
        upstream_id: selectedUpstream.id,
        user_id: user.id
      };
      
      const response = await createUpstreamComment(commentData);
      
      // 새 댓글을 로컬 상태에 추가
      const newComment: Comment = {
        id: response.id,
        time: timeString,
        comment: commentInput.trim(),
        timeNumber: currentTime,
        timeString: timeString,
        user: {
          id: user.id,
          username: user.username
        }
      };
      
      setComments((prev) => [...prev, newComment]);
      setCommentInput('');
      setShowCommentList(true);
      
      // 마커 생성 (얇은 선)
      const ws = wavesurferRefs.current['main'];
      if (ws) {
        try {
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
    } catch (error) {
      console.error('댓글 추가 실패:', error);
    }
  }, [commentInput, currentTime, duration, selectedUpstream, user]);

  // 댓글 로드 함수
  const loadComments = useCallback(async (upstreamId: string) => {
    try {
      setCommentsLoading(true);
      const response = await getUpstreamComments(upstreamId);
      
      if (response.data) {
        const formattedComments = response.data.map((comment: any) => {
          // time 문자열을 파싱하여 숫자로 변환 (MM:SS 형식)
          const [minutes, seconds] = comment.time.split(':').map(Number);
          const timeNumber = minutes * 60 + seconds;
          
          return {
            id: comment.id,
            time: comment.time,
            comment: comment.comment,
            timeNumber: timeNumber,
            timeString: comment.time,
            user: comment.user ? {
              id: comment.user.id,
              username: comment.user.username
            } : undefined
          };
        });
        
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('댓글 로드 실패:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  // 댓글 삭제 함수
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteUpstreamComment(commentId);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
    }
  }, []);

  // 댓글 수정 시작
  const handleEditComment = useCallback((comment: Comment) => {
    setEditingComment(comment.id);
    setEditCommentText(comment.comment);
  }, []);

  // 댓글 수정 저장
  const handleSaveComment = useCallback(async (commentId: string) => {
    if (!editCommentText.trim()) {
      setEditingComment(null);
      return;
    }

    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      await updateUpstreamComment(commentId, {
        comment: editCommentText.trim(),
        time: comment.time
      });

      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { ...c, comment: editCommentText.trim() }
          : c
      ));
      
      setEditingComment(null);
      setEditCommentText('');
    } catch (error) {
      console.error('댓글 수정 실패:', error);
    }
  }, [editCommentText, comments]);

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

  const handleAudioFileClick = useCallback(async (upstream: any) => {
    try {
      // 선택된 upstream 설정
      setSelectedUpstream(upstream);
      
      // 해당 upstream의 댓글 로드
      await loadComments(upstream.id);
      
      // 스트리밍 최적화된 URL을 가져오기
      const response = await streamingService.getUpstreamStems(upstream.id);
      
      if (response.success && response.data && response.data.stems.length > 0) {
        // 첫 번째 스템의 presigned URL 사용
        const streamingUrl = response.data.stems[0].presignedUrl;
        setExtraAudio(streamingUrl);
        setShowExtraWaveform(true);
      } else {
        // 스트리밍 실패 시 원래 URL 사용
        console.warn('Streaming URL failed, using original URL');
        setExtraAudio(upstream.presignedUrl);
        setShowExtraWaveform(true);
      }
    } catch (error) {
      console.error('Error loading streaming URL:', error);
      // 에러 발생 시 원래 URL 사용
      setExtraAudio(upstream.presignedUrl);
      setShowExtraWaveform(true);
    }
  }, [loadComments]);

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
          <div className='flex items-center space-x-4'>
            <button className='text-gray-300 transition-colors hover:text-white border-b-2 border-white pb-1'>
              APPROVE
            </button>
            <button className='text-gray-300 transition-colors hover:text-white border-b-2 border-white pb-1'>
              REJECT
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
          className='self-start rounded bg-[#3a3a3a] px-3 py-1 text-sm hover:bg-[#555]'
        >
          Show History
        </button>
      </div>

      <div className='z-50 flex flex-col gap-2 px-6 pt-4'>
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
                {upstreams.map((upstream, index) => {
                  // 해당 upstream의 stem 정보 찾기
                  const stemInfo = upstreamStems.find(s => s.upstreamId === upstream.id);
                  
                  return (
                    <div key={index} className='space-y-2'>
                      <div
                        onClick={() => handleAudioFileClick(upstream)}
                        className='cursor-pointer rounded bg-[#3a3a3a] p-3 text-sm text-white transition-colors hover:bg-[#4a4a4a]'
                      >
                        <div className='font-medium'>{upstream.fileName}</div>
                        <div className='text-xs text-gray-400'>{upstream.description}</div>
                        <div className='text-xs text-gray-500 mt-1'>
                          Category: {upstream.category} | By: {upstream.uploadedBy?.username}
                        </div>
                      </div>
                      
                      {/* Stem 정보 표시 */}
                      {stemInfo?.stemData && (
                        <div className='ml-4 space-y-1 rounded bg-[#2a2a2a] p-2 text-xs'>
                          <div className='font-medium text-blue-400'>📁 Stems in this upstream:</div>
                          {stemInfo.stemData.map((item: any, stemIndex: number) => (
                            <div key={stemIndex} className='flex items-center justify-between'>
                              <span className='text-white'>
                                {item.category.name} 
                                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                  item.type === 'new' ? 'bg-green-600' :
                                  item.type === 'modify' ? 'bg-yellow-600' :
                                  'bg-gray-600'
                                }`}>
                                  {item.type}
                                </span>
                              </span>
                              <span className='text-gray-400'>{item.stem.file_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
          
          {/* Selected Upstream Info */}
          {selectedUpstream && (
            <div className='mb-4 p-3 bg-[#3a3a3a] rounded'>
              <div className='text-sm font-medium text-white'>{selectedUpstream.fileName}</div>
              <div className='text-xs text-gray-400'>{selectedUpstream.description}</div>
              <div className='text-xs text-blue-400 mt-1'>
                by {selectedUpstream.uploadedBy?.username}
              </div>
            </div>
          )}

          {!selectedUpstream && (
            <div className='mb-4 p-3 bg-[#4a4a4a] rounded text-center'>
              <div className='text-sm text-gray-300'>
                Select an audio file to view comments
              </div>
            </div>
          )}

          {/* Comments List */}
          {commentsLoading ? (
            <div className='flex justify-center py-8'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white'></div>
            </div>
          ) : (
          <ul className='space-y-2 text-sm text-white'>
            {comments.map((comment) => (
              <li 
                key={comment.id}
                className='hover:bg-[#3a3a3a] p-2 rounded'
              >
                <div className='flex items-center justify-between'>
                  <div 
                    className='flex items-center space-x-2 cursor-pointer flex-1'
                    onClick={() => seekToTime(comment.timeNumber)}
                  >
                    <span className='text-blue-400 font-mono'>{comment.timeString}</span>
                    <span>🗨️</span>
                  </div>
                  {user && comment.user?.id === user.id && (
                    <div className='flex items-center space-x-1'>
                      <button
                        onClick={() => handleEditComment(comment)}
                        className='text-gray-400 hover:text-white p-1'
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className='text-gray-400 hover:text-red-400 p-1'
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
                {editingComment === comment.id ? (
                  <div className='ml-6 mt-2'>
                    <input
                      type='text'
                      value={editCommentText}
                      onChange={(e) => setEditCommentText(e.target.value)}
                      className='w-full bg-[#1a1a1a] text-white px-2 py-1 rounded text-xs'
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveComment(comment.id);
                        }
                      }}
                      onBlur={() => handleSaveComment(comment.id)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className='text-gray-300 ml-6'>
                    {comment.comment}
                    {comment.user && (
                      <div className='text-xs text-gray-500 mt-1'>
                        by {comment.user.username}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          )}
        </div>
      )}

      {/* Waveform */}
      <div className='space-y-6'>
        {guideLoading ? (
          <div className='flex justify-center items-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3'></div>
            <span className='text-white'>Loading previous guide...</span>
          </div>
        ) : (
          <Wave
            onReady={handleReady}
            audioUrl={guideAudioUrl || '/audio/track_ex.wav'}
            waveColor='#f87171'
            id='main'
            isPlaying={isPlaying}
            currentTime={currentTime}
            onSolo={handleMainSolo}
            isSolo={soloTrack === 'main'}
            onSeek={handleSeek}
          />
        )}

        {showExtraWaveform && extraAudio && (
          <Wave
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
            placeholder={selectedUpstream ? 'Leave your comment...' : 'Select an audio file to comment'}
            className='flex-1 bg-transparent text-white placeholder-gray-400 outline-none'
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            disabled={!selectedUpstream}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && selectedUpstream) {
                handleAddComment();
              }
            }}
          />
          <button
            className={`${
              selectedUpstream && commentInput.trim() 
                ? 'text-blue-400 hover:text-blue-300' 
                : 'text-gray-600 cursor-not-allowed'
            }`}
            onClick={handleAddComment}
            disabled={!selectedUpstream || !commentInput.trim()}
          >
            ▶️
          </button>
        </div>
        {selectedUpstream && (
          <div className='mt-2 text-center text-sm text-gray-400'>
            Commenting on: {selectedUpstream.fileName}
          </div>
        )}
      </div>
    </div>
  );
};

export default StemSetReviewPage;                 
