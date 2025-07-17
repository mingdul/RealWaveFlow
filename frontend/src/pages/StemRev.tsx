import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Wave from '../components/wave';
import Logo from '../components/Logo';
import {
  getUpstreamStems,
  getUpstreamByUpstreamId,
} from '../services/upstreamService';
import {
  getStageDetail,
} from '../services/stageService';
import streamingService from '../services/streamingService';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/Button';
import {
  approveDropReviewer,
  rejectDropReviewer,
} from '../services/upstreamReviewService';
import { useNavigate } from 'react-router-dom';
import {
  createUpstreamComment,
  getUpstreamComments,
  deleteUpstreamComment,
  updateUpstreamComment,
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
  Square,
  ChevronLeft,
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

const StemRev = () => {
  const { user } = useAuth();
  const { showError, showSuccess, showWarning} = useToast();
  const navigate = useNavigate();
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
  const [stemsLoading, setStemsLoading] = useState(false);
  const [upstreamStems, setUpstreamStems] = useState<any[]>([]);
  const [guideAudioUrl, setGuideAudioUrl] = useState<string>('');
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideLoadAttempted, setGuideLoadAttempted] = useState(false); // 가이드 로드 시도 여부 추가
  const [guidePeaks, setGuidePeaks] = useState<any>(null); // guide waveform 데이터
  const [extraPeaks, setExtraPeaks] = useState<any>(null); // extra/stem waveform 데이터

  const wavesurferRefs = useRef<{ [id: string]: WaveSurfer }>({});
  const [readyStates, setReadyStates] = useState<{ [id: string]: boolean }>({});
  const isSeeking = useRef(false); // 무한 루프 방지용 플래그
  const { upstreamId, stageId: urlStageId } = useParams<{ upstreamId: string, stageId: string }>();
  const [stageId, setStageId] = useState<string | undefined>(urlStageId);


  // stageId 결정 로직 (쿼리 파라미터 우선, 없으면 upstream API 사용)
  useEffect(() => {
    const determineStageId = async () => {
      // URL에서 stageId가 없는 경우에만 upstream에서 추출
      if (upstreamId && !urlStageId) {
          try {
            console.log('🔍 [determineStageId] Found upstreamId in URL params, fetching upstream details:', upstreamId);
            // upstream 정보를 가져와서 stageId 추출
            const upstreamData = await getUpstreamByUpstreamId(upstreamId);
            console.log('📦 [determineStageId] Upstream data response:', upstreamData);
            
            if (upstreamData?.data?.upstream) {
              console.log('📦 [determineStageId] Upstream object:', upstreamData.data.upstream);
              console.log('📦 [determineStageId] Upstream keys:', Object.keys(upstreamData.data.upstream));
              
              // stage 정보가 있는지 확인
              if (upstreamData.data.upstream.stage) {
                const extractedStageId = upstreamData.data.upstream.stage.id;
                console.log('✅ [determineStageId] Extracted stageId from upstream:', extractedStageId);
                setStageId(extractedStageId); // stageId state 업데이트
              } else {
                console.warn('⚠️ [determineStageId] No stage information in upstream');
              }

              // 선택된 upstream 설정
              console.log('✅ [determineStageId] Setting selected upstream:', upstreamData.data.upstream);
              setSelectedUpstream(upstreamData.data.upstream);
              
              // stageId가 설정되었으므로 즉시 스템 데이터 로드 (함수 정의 후에 호출)

            } else {
              console.error('❌ [determineStageId] No upstream data found in response');
            }
          } catch (error) {
            console.error('❌ [determineStageId] Error fetching upstream details:', error);
            console.error('❌ [determineStageId] Error details:', (error as any)?.message);
          }
          return;
        }

      console.log('⚠️ [determineStageId] No stageId or upstreamId found');
    };

    determineStageId();
  }, [upstreamId, urlStageId]);

  // 상태 변경 추적을 위한 로그

  useEffect(() => {
    console.log('📊 [State] UpstreamStems data:', upstreamStems);
    if (upstreamStems.length > 0) {
      console.log('📊 [State] First upstream sample:', upstreamStems[0]);
    }
  }, [upstreamStems]);

  // 이전 버전의 가이드 스템 URL 가져오기
  useEffect(() => {
    const fetchGuideUrl = async () => {
      if (!stageId) return;

      try {
        setGuideLoading(true);
        setGuideLoadAttempted(true); // 로드 시도 표시

        // 1. 현재 스테이지 정보 가져오기
        console.log('🔍 [fetchPreviousGuideUrl] Starting with stageId:', stageId);
        const currentStageResponse = await getStageDetail(stageId);
        
        if (!currentStageResponse || !currentStageResponse.data) {
          console.error('❌ [fetchPreviousGuideUrl] Current stage not found - Response:', currentStageResponse);
          return;
        }


        // 5. guide audio URL 가져오기 (오디오 재생용)
        const audioResponse = await streamingService.getGuidePresignedUrlbyUpstream(upstreamId as string);
        console.log('🎵 [fetchPreviousGuideUrl] Guide audio response:', audioResponse);
        
        if (audioResponse.success && audioResponse.data) {
          setGuideAudioUrl(audioResponse.data.presignedUrl);
          console.log('🎵 Guide audio URL set:', audioResponse.data.presignedUrl);
        } else {
          console.warn('⚠️ Guide audio not available, using fallback');
          setGuideAudioUrl('/audio/track_ex.wav');
        }

        // 6. guide waveform 데이터 가져오기 (파형 표시용)
        const waveformResponse = await streamingService.getGuideWaveformData(upstreamId as string);
        console.log('🌊 [fetchPreviousGuideUrl] Guide waveform response:', waveformResponse);
        
        if (waveformResponse.success && waveformResponse.data) {
          console.log('🌊 Guide waveform data type:', typeof waveformResponse.data);
          console.log('🌊 Guide waveform data structure:', waveformResponse.data);
          
          // 데이터가 배열인지 객체인지 확인
          if (Array.isArray(waveformResponse.data)) {
            console.log('🌊 Guide waveform data is array with length:', waveformResponse.data.length);
          } else if (waveformResponse.data.data && Array.isArray(waveformResponse.data.data)) {
            console.log('🌊 Guide waveform data.data is array with length:', waveformResponse.data.data.length);
          }
          
          setGuidePeaks(waveformResponse.data);
        } else {
          console.warn('⚠️ Guide waveform data not available');
          setGuidePeaks(null);
        }
      } catch (error) {
        setGuideAudioUrl('/audio/track_ex.wav');
      } finally {
        setGuideLoading(false);
      }
    };

    fetchGuideUrl();
  }, [stageId]);

  // 스템 데이터 로드 함수 분리
  const loadStemsData = async (stageId: string, upstream: any) => {
    try {
      console.log('🎯 [loadStemsData] Loading stems for stageId:', stageId, 'upstream:', upstream.id);
      setStemsLoading(true);
      
      const stageResponse = await getStageDetail(stageId);
      
      if (!stageResponse || !stageResponse.data) {
        console.error('❌ [loadStemsData] track 정보가 없습니다:', stageResponse);
        return;
      }
    
      const currentTrackId = stageResponse.data.track.id;
      console.log('🔍 currentTrackId:', currentTrackId);
      console.log('🔍 upstream:', upstream);
      
      // ✅ 단일 upstream에 대해서만 처리
      console.log('🎯 단일 upstream에 대해 getUpstreamStems 호출:', upstream.id);
      const stemResponse = await getUpstreamStems(upstream.id, currentTrackId);
      console.log('📦 [loadStemsData] Stem response:', stemResponse);
      console.log('📦 [loadStemsData] Stem response.data:', stemResponse?.data);
      console.log('📦 [loadStemsData] Stem response.data.data:', stemResponse?.data?.data);
      if(!stemResponse || !stemResponse.data || !stemResponse.data.data){
        console.log('❌ [loadStemsData] stem 정보가 없습니다:', stemResponse);
      } else {
        console.log('✅ [loadStemsData] stem 정보 있음. 데이터 길이:', stemResponse.data.data?.length);
        console.log('✅ [loadStemsData] stem 정보 첫번째 아이템:', stemResponse.data.data[0]);
      }
      
      const stemsResult = [
        {
          ...upstream,
          upstreamId: upstream.id,
          stemData: stemResponse?.data?.data || null,
        },
      ];
      console.log('✅ [loadStemsData] Stems result:', stemsResult);
      console.log('✅ [loadStemsData] Stems result[0].stemData:', stemsResult[0].stemData);
      setUpstreamStems(stemsResult);
    } catch (error) {
      console.error('❌ [loadStemsData] 오류:', error);
      showError('스템 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setStemsLoading(false);
    }
  };

  useEffect(() => {
    // stageId와 selectedUpstream이 모두 설정되면 스템 데이터 로드
    if (stageId && selectedUpstream) {
      console.log('🎬 useEffect triggered with stageId:', stageId, 'selectedUpstream:', selectedUpstream.id);
      loadStemsData(stageId, selectedUpstream);
    } else {
      console.log('⚠️ No stageId or selectedUpstream provided');
    }
  }, [stageId, selectedUpstream]);

 

  const handleReady = useCallback(
    (ws: WaveSurfer, id: string) => {
      wavesurferRefs.current[id] = ws;

      // ready 상태 업데이트
      setReadyStates((prev) => ({ ...prev, [id]: true }));

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
    },
    [soloTrack]
  );

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

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [soloTrack]
  );

  // 댓글 추가 함수
  const handleAddComment = useCallback(async () => {
    if (!commentInput.trim() || !user) return;

    const timeString = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`;

    try {
      const commentData = {
        comment: commentInput.trim(),
        time: timeString,
        upstream_id: selectedUpstream.id,
        user_id: user.id,
      };

      const response = await createUpstreamComment(commentData);

      // 백엔드 응답 구조에 맞게 수정: upstream_comment 객체에서 데이터 추출
      const createdComment = response.upstream_comment || response;
      
      // 새 댓글을 로컬 상태에 추가
      const newComment: Comment = {
        id: createdComment.id,
        time: timeString,
        comment: commentInput.trim(),
        timeNumber: currentTime,
        timeString: timeString,
        user: {
          id: user.id,
          username: user.username,
        },
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
    console.log('🔍🔍🔍🔍 loadComments:', upstreamId);
    try {
      setCommentsLoading(true);
      const response = await getUpstreamComments(upstreamId);
      console.log('🔍🔍🔍🔍 response comments:', response);
      
      // API 응답 구조에 맞게 수정: upstreamComments 배열 사용
      const commentsData = response.upstreamComments || response.data || [];
      console.log('📦 [loadComments] Comments data:', commentsData);

      if (commentsData && Array.isArray(commentsData)) {
        const formattedComments = commentsData.map((comment: any) => {
          console.log('📝 [loadComments] Processing comment:', comment);
          
          // time 문자열을 파싱하여 숫자로 변환 (MM:SS 형식)
          const [minutes, seconds] = comment.time.split(':').map(Number);
          const timeNumber = minutes * 60 + seconds;

          return {
            id: comment.id,
            time: comment.time,
            comment: comment.comment,
            timeNumber: timeNumber,
            timeString: comment.time,
            user: comment.user
              ? {
                id: comment.user.id,
                username: comment.user.username,
              }
              : undefined,
          };
        });

        console.log('✅ [loadComments] Formatted comments:', formattedComments);
        setComments(formattedComments);
      } else {
        console.warn('⚠️ [loadComments] No comments data found');
        setComments([]);
      }
    } catch (error) {
      console.error('댓글 로드 실패:', error);
      showError('댓글을 불러오는 중 오류가 발생했습니다.');
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🔍🔍 selectedUpstream:', selectedUpstream);
    
    if (selectedUpstream?.id) {
      console.log('💬 [useEffect] Loading comments for upstream:', selectedUpstream.id);
      loadComments(selectedUpstream.id);
    } else {
      console.log('⚠️ [useEffect] No selectedUpstream or missing id');
    }
  
  }, [selectedUpstream, loadComments]);
  

  // 댓글 삭제 함수
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteUpstreamComment(commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      showError('댓글 삭제 중 오류가 발생했습니다.');
    }
  }, []);

  // 댓글 수정 시작
  const handleEditComment = useCallback((comment: Comment) => {
    setEditingComment(comment.id);
    setEditCommentText(comment.comment);
  }, []);

  // 댓글 수정 저장
  const handleSaveComment = useCallback(
    async (commentId: string) => {
      if (!editCommentText.trim()) {
        setEditingComment(null);
        return;
      }

      try {
        const comment = comments.find((c) => c.id === commentId);
        if (!comment) return;

        await updateUpstreamComment(commentId, {
          comment: editCommentText.trim(),
          time: comment.time,
        });

        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, comment: editCommentText.trim() } : c
          )
        );

        setEditingComment(null);
        setEditCommentText('');
      } catch (error) {
        console.error('댓글 수정 실패:', error);
        showError('댓글 수정 중 오류가 발생했습니다.');
      }
    },
    [editCommentText, comments]
  );

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

  const handleSeek = useCallback(
    (time: number, trackId: string) => {
      // 무한 루프 방지
      if (isSeeking.current) return;

      isSeeking.current = true;
      setCurrentTime(time);

      // 양방향 동기화: 움직인 트랙이 아닌 다른 트랙을 동기화
      const mainPlayer = wavesurferRefs.current['main'];
      const extraPlayer = wavesurferRefs.current['extra'];

      if (
        mainPlayer &&
        extraPlayer &&
        readyStates['main'] &&
        readyStates['extra']
      ) {
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
    },
    [readyStates]
  );

  // 개별 스템 클릭 핸들러
  const handleIndividualStemClick = useCallback(
    async (stemData: any, upstream: any) => {
      try {
        console.log('🎵 [handleIndividualStemClick] Individual stem clicked:', stemData);

        // Stem waveform 데이터 가져오기
        const stemWaveformData = await streamingService.getStemWaveformData(stemData.stem.id);
        console.log('🌊 Stem waveform data:', stemWaveformData);
        
        if (stemWaveformData.success && stemWaveformData.data) {
          setExtraPeaks(stemWaveformData.data);
          console.log('📦 Stem waveform data:', stemWaveformData.data);
        } else {
          showWarning('No waveform data available for this stem');
          setExtraPeaks(null);
        }
        setShowExtraWaveform(true);
        // 선택된 upstream 설정 (댓글을 위해)
        setSelectedUpstream(upstream);

        // 개별 스템의 스트리밍 URL 가져오기
        let streamingUrl = '';
        
        if (stemData.type === 'unchanged' && stemData.stem?.id) {
          // version-stem API 사용
          try {
            const versionStemResponse = await streamingService.getVersionStemStreamingUrl(stemData.stem.id);
            if (versionStemResponse.success && versionStemResponse.data?.presignedUrl) {
              streamingUrl = versionStemResponse.data.presignedUrl;
            }
          } catch (error) {
            console.warn('Version stem streaming failed, trying regular stem API');
          }
        }
        
        if (!streamingUrl && stemData.stem?.id) {
          // 일반 stem API 사용
          try {
            const stemResponse = await streamingService.getStemStreamingUrl(stemData.stem.id);
            if (stemResponse.success && stemResponse.data?.presignedUrl) {
              streamingUrl = stemResponse.data.presignedUrl;
            }
          } catch (error) {
            console.warn('Regular stem streaming failed');
          }
        }

        if (streamingUrl) {
          console.log('✅ [handleIndividualStemClick] Using streaming URL:', streamingUrl);
          setExtraAudio(streamingUrl);
        } else {
          console.warn('⚠️ [handleIndividualStemClick] No streaming URL available for stem');
          showWarning('No audio file available for this stem');
        }
      } catch (error) {
        console.error('Error loading individual stem:', error);
        showError('Failed to load stem audio');
      }
    },
    []
  );

  // Solo 버튼 핸들러들을 메모이제이션
  const handleMainSolo = useCallback(() => handleSolo('main'), [handleSolo]);
  const handleExtraSolo = useCallback(() => handleSolo('extra'), [handleSolo]);

  // audioprocess 이벤트를 통한 재생 중 동기화 (main -> extra만)
  useEffect(() => {
    const extraPlayer = wavesurferRefs.current['extra'];
    const mainPlayer = wavesurferRefs.current['main'];

    // 재생 중일 때만 audioprocess 이벤트를 통한 동기화 수행
    if (
      isPlaying &&
      extraPlayer &&
      mainPlayer &&
      readyStates['extra'] &&
      readyStates['main']
    ) {
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

  const handleApprove = async () => {
    console.log('🔍 Stage ID:', stageId);
    console.log('🔍 Selected Upstream:', upstreamId);

   
    if (!stageId || !upstreamId) {
      showWarning('Stage 또는 Upstream이 선택되지 않았습니다.');
      return;
    }

    try {
      await approveDropReviewer(stageId, upstreamId);
      showSuccess('승인 완료!');
    } catch (error) {
      console.error('승인 실패:', error);
      showError('승인 중 오류 발생');
    }
  };

  const handleReject = async () => {
    if (!stageId || !upstreamId) {
      showWarning('Stage 또는 Upstream이 선택되지 않았습니다.');
      return;
    }

    try {
      await rejectDropReviewer(stageId, upstreamId);
      showSuccess('거절 완료!');
    } catch (error) {
      console.error('거절 실패:', error);
      showError('거절 중 오류 발생');
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Abstract Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Network Lines */}
          <g stroke="url(#lineGradient)" strokeWidth="1" fill="none" filter="url(#glow)">
            <path d="M100,100 L250,180 L180,280 L80,220 Z" />
            <path d="M250,180 L400,120 L380,250 L250,300" />
            <path d="M500,200 L700,150 L800,300 L650,400 L450,350 Z" />
            <path d="M700,150 L920,180 L880,320 L800,300" />
            <path d="M1200,100 L1400,150 L1350,280 L1150,250 Z" />
          </g>
          
          {/* Network Nodes */}
          <g>
            <circle cx="250" cy="180" r="3" fill="#8b5cf6" filter="url(#glow)" />
            <circle cx="500" cy="200" r="5" fill="#a855f7" filter="url(#glow)" />
            <circle cx="700" cy="150" r="4" fill="#7c3aed" filter="url(#glow)" />
            <circle cx="800" cy="300" r="4" fill="#8b5cf6" filter="url(#glow)" />
          </g>
        </svg>
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-950/70 via-transparent to-purple-950/90"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-transparent to-transparent"></div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen overflow-y-auto">
        <div className="backdrop-blur-sm">
          {/* Header */}
          <div className="bg-black/30 backdrop-blur-lg border-b border-white/10 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Left Section */}
              <div className="flex items-center space-x-4">
                <Button size="sm" className="p-2 bg-white/10 hover:bg-white/20 text-white border-white/20" onClick={() => navigate(`/stage/${stageId}`)}>
                  <ChevronLeft size={20} />
                </Button>
                <Logo />
              </div>

              {/* Center Section - Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleApprove}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-green-500/25"
                >
                  APPROVE
                </button>
                <button
                  onClick={handleReject}
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25"
                >
                  REJECT
                </button>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3">
                <Button size="sm" className="p-2 bg-white/10 hover:bg-white/20 text-white border-white/20">
                  <Bell size={20} />
                </Button>
                <Button size="sm" className="p-2 bg-white/10 hover:bg-white/20 text-white border-white/20">
                  <Settings size={20} />
                </Button>
              </div>
            </div>
          </div>

          {/* Sub Header - Control Buttons */}
          <div className="px-4 sm:px-6 lg:px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10">
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  console.log('🔍 [Show History] Button clicked. Current state:', { 
                    showHistory, 
                    upstreamStems: upstreamStems.length,
                    upstreamStemsData: upstreamStems,
                    stageId,
                    selectedUpstream,
                    stemsLoading
                  });
                  setShowHistory(!showHistory);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  showHistory 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25' 
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                } ${upstreamStems.length === 0 ? 'opacity-50' : ''}`}
              >
                Show History {upstreamStems.length > 0 && `(${upstreamStems.length})`}
              </button>

              <button
                onClick={() => setShowCommentList(!showCommentList)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  showCommentList
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                Comments {comments.length > 0 && `(${comments.length})`}
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* Waveform Section */}
            <div className="space-y-6">
              {/* Guide Waveform */}
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl transform transition-all duration-300 hover:scale-[1.01]">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-2">가이드 트랙</h3>
                  <div className="h-1 bg-gradient-to-r from-red-500 to-red-300 rounded-full"></div>
                </div>
                
                {guideLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      <span className="text-white">Loading guide...</span>
                    </div>
                  </div>
                ) : guideLoadAttempted && guideAudioUrl ? (
                  <>
                    {console.log('DEBUG: Guide Wave Component Props - audioUrl:', guideAudioUrl, 'peaks:', guidePeaks)}
                    <Wave
                      onReady={handleReady}
                      audioUrl={guideAudioUrl}
                      peaks={guidePeaks}
                      waveColor='#f87171'
                      id='main'
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      onSolo={handleMainSolo}
                      isSolo={soloTrack === 'main'}
                      onSeek={handleSeek}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <span className="text-white">No guide audio available for this stage</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Comparison Waveform */}
              {showExtraWaveform && extraAudio && (
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl transform transition-all duration-300 hover:scale-[1.01]">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">비교 트랙</h3>
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-300 rounded-full"></div>
                  </div>
                  
                  
                  <Wave
                    onReady={handleReady}
                    audioUrl={extraAudio}
                    peaks={extraPeaks}
                    waveColor='#60a5fa'
                    id='extra'
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    onSolo={handleExtraSolo}
                    isSolo={soloTrack === 'extra'}
                    onSeek={handleSeek}
                  />
                </div>
              )}
            </div>

            {/* Control Bar */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Playback Controls */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={stopPlayback}
                      className="p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-200"
                    >
                      <Square size={20} />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="p-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center space-x-3">
                    <Volume size={20} className="text-white/70" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-24 accent-purple-500"
                    />
                  </div>

                  {/* Time Display */}
                  <div className="text-white/80 font-mono">
                    {Math.floor(currentTime / 60)}:
                    {String(Math.floor(currentTime % 60)).padStart(2, '0')} /{' '}
                    {Math.floor(duration / 60)}:
                    {String(Math.floor(duration % 60)).padStart(2, '0')}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Speed Control */}
                  <button className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-all duration-200">
                    1x
                  </button>

                  {/* Zoom Controls */}
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200">
                    <ZoomIn size={18} />
                  </button>
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200">
                    <ZoomOut size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Comment Input */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">댓글 작성</h3>
              <div className="flex items-center gap-4">
                <span className="px-3 py-2 rounded-lg bg-purple-600/50 text-white font-mono text-sm">
                  {String(Math.floor(currentTime / 60)).padStart(2, '0')}:
                  {String(Math.floor(currentTime % 60)).padStart(2, '0')}
                </span>
                <input
                  type="checkbox"
                  checked
                  className="accent-green-500 scale-125"
                  readOnly
                />
                <input
                  type="text"
                  placeholder={
                    selectedUpstream
                      ? 'Leave your comment...'
                      : 'Select an audio file to comment'
                  }
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
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
                  className={`p-3 rounded-lg transition-all duration-200 ${
                    selectedUpstream && commentInput.trim()
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/25'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                  onClick={handleAddComment}
                  disabled={!selectedUpstream || !commentInput.trim()}
                >
                  <Play size={20} />
                </button>
              </div>
              {selectedUpstream && (
                <div className="mt-3 text-sm text-white/60">
                  Commenting on: <span className="text-purple-300">{selectedUpstream.title}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="fixed right-0 top-0 z-40 h-full w-80 bg-black/40 backdrop-blur-xl border-l border-white/10 shadow-2xl">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Streaming Audio Files</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide">Available Stem Files</h3>
                
                {stemsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      <span className="text-white/80">Loading stems...</span>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-96 space-y-3 overflow-y-auto scrollbar-hide">
                    {(() => {
                      console.log('🎨 [Render] === RENDER START ===');
                      console.log('🎨 [Render] showHistory:', showHistory);
                      console.log('🎨 [Render] stemsLoading:', stemsLoading);
                      console.log('🎨 [Render] upstreamStems.length:', upstreamStems.length);
                      console.log('🎨 [Render] upstreamStems:', upstreamStems);
                      console.log('🎨 [Render] stageId:', stageId);
                      console.log('🎨 [Render] selectedUpstream:', selectedUpstream);
                      
                      if (upstreamStems.length === 0) {
                        return (
                          <div className="py-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <div className="text-white/60">No stems found for this upstream</div>
                            <div className="text-xs text-white/40 mt-2">
                              Debug: stageId={stageId}, selectedUpstream={selectedUpstream?.id}
                            </div>
                          </div>
                        );
                      }

                      // Process stems for rendering
                      const allStems: any[] = [];
                      
                      upstreamStems.forEach((stemItem, upstreamIndex) => {
                        if (stemItem?.stemData && Array.isArray(stemItem.stemData)) {
                          const sortedStems = [...stemItem.stemData].sort((a, b) => {
                            const typeOrder = { 'new': 0, 'modify': 1, 'unchanged': 2 };
                            return (typeOrder[a.type as keyof typeof typeOrder] || 3) - 
                                   (typeOrder[b.type as keyof typeof typeOrder] || 3);
                          });
                          
                          sortedStems.forEach((stem: any, stemIndex: number) => {
                            allStems.push({
                              data: stem,
                              upstream: stemItem,
                              key: `stem-${upstreamIndex}-${stemIndex}`,
                            });
                          });
                        }
                      });

                      return allStems.map((item) => {
                        const stemData = item.data;
                        const upstream = item.upstream;
                        
                        const getTypeStyle = (type: string) => {
                          switch (type) {
                            case 'new':
                              return {
                                icon: '✨',
                                bgColor: 'bg-gradient-to-r from-green-600/20 to-green-700/20',
                                borderColor: 'border-l-4 border-green-400',
                                badgeColor: 'bg-green-600 text-white',
                                hoverColor: 'hover:from-green-600/30 hover:to-green-700/30'
                              };
                            case 'modify':
                              return {
                                icon: '🔄',
                                bgColor: 'bg-gradient-to-r from-yellow-600/20 to-yellow-700/20',
                                borderColor: 'border-l-4 border-yellow-400',
                                badgeColor: 'bg-yellow-600 text-white',
                                hoverColor: 'hover:from-yellow-600/30 hover:to-yellow-700/30'
                              };
                            case 'unchanged':
                              return {
                                icon: '📄',
                                bgColor: 'bg-gradient-to-r from-gray-600/20 to-gray-700/20',
                                borderColor: 'border-l-4 border-gray-400',
                                badgeColor: 'bg-gray-600 text-white',
                                hoverColor: 'hover:from-gray-600/30 hover:to-gray-700/30'
                              };
                            default:
                              return {
                                icon: '❓',
                                bgColor: 'bg-gradient-to-r from-gray-600/20 to-gray-700/20',
                                borderColor: 'border-l-4 border-gray-400',
                                badgeColor: 'bg-gray-600 text-white',
                                hoverColor: 'hover:from-gray-600/30 hover:to-gray-700/30'
                              };
                          }
                        };
                        
                        const typeStyle = getTypeStyle(stemData.type);
                        
                        return (
                          <div
                            key={item.key}
                            onClick={() => handleIndividualStemClick(stemData, upstream)}
                            className={`cursor-pointer rounded-xl p-4 border border-white/10 backdrop-blur-sm transition-all duration-200 ${typeStyle.bgColor} ${typeStyle.borderColor} ${typeStyle.hoverColor} hover:shadow-lg transform hover:scale-[1.02]`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{typeStyle.icon}</span>
                                <span className="font-medium text-white">{stemData.category?.name || 'Unknown Category'}</span>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${typeStyle.badgeColor}`}>
                                {stemData.type?.toUpperCase() || 'UNKNOWN'}
                              </span>
                            </div>
                            <div className="text-sm text-white/70 mb-2">
                              📁 {stemData.stem?.file_name || 'Unknown file'}
                            </div>
                            <div className="text-xs text-white/50">
                              🎼 {stemData.category?.instrument || 'Unknown'} • 
                              👤 {stemData.stem?.user?.username || upstream?.user?.username || 'Unknown'}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comments Sidebar */}
        {showCommentList && (
          <div className="fixed right-0 top-0 z-40 h-full w-80 bg-black/40 backdrop-blur-xl border-l border-white/10 shadow-2xl">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Comments</h2>
                <button
                  onClick={() => setShowCommentList(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Selected Upstream Info */}
              {selectedUpstream ? (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-700/20 border border-purple-500/30">
                  <div className="text-sm font-medium text-white mb-1">
                    {selectedUpstream.title}
                  </div>
                  <div className="text-xs text-white/60 mb-2">
                    {selectedUpstream.description}
                  </div>
                  <div className="text-xs text-purple-300">
                    by {selectedUpstream.user?.username}
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-sm text-white/60">
                    Select an audio file to view comments
                  </div>
                </div>
              )}

              {/* Comments List */}
              {commentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    <span className="text-white/80">Loading comments...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                  {comments.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="text-white/60">No comments yet</div>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className="flex items-center space-x-3 cursor-pointer"
                            onClick={() => seekToTime(comment.timeNumber)}
                          >
                            <span className="px-2 py-1 rounded-lg bg-blue-600/50 text-white font-mono text-xs">
                              {comment.timeString}
                            </span>
                            <span>💬</span>
                          </div>
                          {user && comment.user?.id === user.id && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEditComment(comment)}
                                className="p-1 rounded text-white/60 hover:text-white hover:bg-white/20 transition-all duration-200"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 rounded text-white/60 hover:text-red-400 hover:bg-red-500/20 transition-all duration-200"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        {editingComment === comment.id ? (
                          <input
                            type="text"
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="w-full mt-2 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveComment(comment.id);
                              }
                            }}
                            onBlur={() => handleSaveComment(comment.id)}
                            autoFocus
                          />
                        ) : (
                          <div className="text-white/80 text-sm">
                            {comment.comment}
                            {comment.user && (
                              <div className="mt-2 text-xs text-white/50">
                                by {comment.user.username}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StemRev;