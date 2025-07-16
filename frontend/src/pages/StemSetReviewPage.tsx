import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Wave from '../components/wave';
import Logo from '../components/Logo';
import {
  getStageUpstreams,
  getUpstreamStems,
  getUpstreamDetail,
} from '../services/upstreamService';
import {
  getStageDetail,
  getStageByTrackIdAndVersion,
} from '../services/stageService';
import streamingService from '../services/streamingService';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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

const StemSetReviewPage = () => {
  const { user } = useAuth();
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
  const [stemsLoading] = useState(false);
  const [upstreams, setUpstreams] = useState<any[]>([]);
  const [upstreamStems, setUpstreamStems] = useState<any[]>([]);
  const [guideAudioUrl, setGuideAudioUrl] = useState<string>('');
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideLoadAttempted, setGuideLoadAttempted] = useState(false); // 가이드 로드 시도 여부 추가

  const wavesurferRefs = useRef<{ [id: string]: WaveSurfer }>({});
  const [readyStates, setReadyStates] = useState<{ [id: string]: boolean }>({});
  const isSeeking = useRef(false); // 무한 루프 방지용 플래그
  const { upstreamId: paramUpstreamId } = useParams<{ upstreamId: string }>();
  const [searchParams] = useSearchParams();
  const [stageId, setStageId] = useState<string | null>(null);

  // stageId 결정 로직 (쿼리 파라미터 우선, 없으면 upstream API 사용)
  useEffect(() => {
    const determineStageId = async () => {
      console.log('🚀 [determineStageId] Starting stage ID determination...');
      console.log('🔍 [determineStageId] paramUpstreamId:', paramUpstreamId);
      console.log('🔍 [determineStageId] searchParams:', Object.fromEntries(searchParams.entries()));
      
      // 1. 먼저 쿼리 파라미터에서 stageId 확인
      const stageIdFromQuery = searchParams.get('stageId');
      console.log('🔍 [determineStageId] stageIdFromQuery:', stageIdFromQuery);
      
      if (stageIdFromQuery) {
        console.log('✅ [determineStageId] Found stageId in query params:', stageIdFromQuery);
        setStageId(stageIdFromQuery);
        
        // stageId가 있으므로 getStageUpstreams를 사용해서 모든 upstream 목록을 가져오고
        // 그 중에서 paramUpstreamId와 일치하는 것을 찾아서 selectedUpstream 설정
        if (paramUpstreamId) {
          try {
            console.log('🔍 [determineStageId] Looking for upstream in stage upstreams...');
            const upstreamsResponse = await getStageUpstreams(stageIdFromQuery);
            console.log('📁 [determineStageId] Stage upstreams response:', upstreamsResponse);
            const targetUpstream = upstreamsResponse.find((upstream: any) => upstream.id === paramUpstreamId);
            if (targetUpstream) {
              console.log('✅ [determineStageId] Found target upstream in stage upstreams:', targetUpstream);
              setSelectedUpstream(targetUpstream);
            } else {
              console.warn('⚠️ [determineStageId] Target upstream not found in stage upstreams');
              console.log('📋 [determineStageId] Available upstreams:', upstreamsResponse.map((u: any) => ({id: u.id, fileName: u.fileName})));
            }
          } catch (error) {
            console.error('❌ [determineStageId] Error fetching stage upstreams:', error);
          }
        }
        return;
      }

      // 2. 쿼리 파라미터에 stageId가 없으면 기존 방식 사용 (upstream API를 통해 stageId 추출)
      if (paramUpstreamId) {
        try {
          console.log('🔍 [determineStageId] Found upstreamId in URL params, fetching upstream details:', paramUpstreamId);
          // upstream 정보를 가져와서 stageId 추출
          const upstreamData = await getUpstreamDetail(paramUpstreamId);
          console.log('📦 [determineStageId] Upstream data response:', upstreamData);
          const extractedStageId =
            upstreamData.stage?.id || upstreamData.stage_id;
          console.log('✅ [determineStageId] Extracted stageId from upstream:', extractedStageId);
          setStageId(extractedStageId);

          // 선택된 upstream 설정
          console.log('✅ [determineStageId] Setting selected upstream:', upstreamData);
          setSelectedUpstream(upstreamData);
        } catch (error) {
          console.error('❌ [determineStageId] Error fetching upstream details:', error);
          console.error('❌ [determineStageId] Error details:', (error as any)?.message);
        }
        return;
      }

      console.log('⚠️ [determineStageId] No stageId or upstreamId found');
    };

    determineStageId();
  }, [paramUpstreamId, searchParams]);

  // 상태 변경 추적을 위한 로그
  useEffect(() => {
    console.log('📊 Upstreams state updated:', upstreams);
  }, [upstreams]);

  useEffect(() => {
    console.log('📊 UpstreamStems state updated:', upstreamStems);
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
        console.log('📦 [fetchPreviousGuideUrl] Raw API response:', currentStageResponse);
        console.log('📦 [fetchPreviousGuideUrl] Response type:', typeof currentStageResponse);
        console.log('📦 [fetchPreviousGuideUrl] Response data:', currentStageResponse?.data);
        
        if (!currentStageResponse || !currentStageResponse.data) {
          console.error('❌ [fetchPreviousGuideUrl] Current stage not found - Response:', currentStageResponse);
          return;
        }

        const { track, version } = currentStageResponse.data;
        const trackId = track.id;


        // 3. 이전 버전의 스테이지 정보 가져오기

        const stage = await getStageByTrackIdAndVersion(
          trackId,
          version
        );

        // 5. guide_path를 presigned URL로 변환
        const response =
          await streamingService.getGuidePresignedUrlByStageId(stage.id);
        
        
        if (response.success && response.data) {
          setGuideAudioUrl(response.data.presignedUrl);
        } else {
          setGuideAudioUrl('/audio/track_ex.wav');
        }
      } catch (error) {
        setGuideAudioUrl('/audio/track_ex.wav');
      } finally {
        setGuideLoading(false);
      }
    };

    fetchGuideUrl();
  }, [stageId]);

  useEffect(() => {
    const fetchUpstreamsAndStems = async () => {
      try {
        console.log(
          '🚀 Starting fetchUpstreamsAndStems with stageId:',
          stageId
        );

        // 1. 먼저 stage 정보를 가져와서 trackId 획득
        console.log('🔍 [fetchUpstreamsAndStems] Starting with stageId:', stageId);
        const stageResponse = await getStageDetail(stageId || '');
        console.log('📊 [fetchUpstreamsAndStems] Stage detail response:', stageResponse);
        console.log('📊 [fetchUpstreamsAndStems] Response data structure:', stageResponse?.data);
        console.log('📊 [fetchUpstreamsAndStems] Track info:', stageResponse?.data?.track);

        if (!stageResponse || !stageResponse.data || !stageResponse.data.track) {
          console.error('❌ [fetchUpstreamsAndStems] Failed to get stage details - Response:', stageResponse);
          console.error('❌ [fetchUpstreamsAndStems] Missing data:', {
            hasResponse: !!stageResponse,
            hasData: !!stageResponse?.data,
            hasTrack: !!stageResponse?.data?.track
          });
          return;
        }

        const currentTrackId = stageResponse.data.track.id;
        console.log('🎵 [fetchUpstreamsAndStems] Current track ID:', currentTrackId);

        // 2. upstream 목록 가져오기
        console.log('🔍 [fetchUpstreamsAndStems] Getting upstreams for stageId:', stageId);
        const upstreamsResponse = await getStageUpstreams(stageId || '');
        console.log('📁 [fetchUpstreamsAndStems] Upstreams response:', upstreamsResponse);
        console.log('📁 [fetchUpstreamsAndStems] Upstreams response type:', typeof upstreamsResponse);
        console.log('📁 [fetchUpstreamsAndStems] Upstreams is array:', Array.isArray(upstreamsResponse));

        if (!upstreamsResponse || !Array.isArray(upstreamsResponse) || upstreamsResponse.length === 0) {
          console.error('❌ [fetchUpstreamsAndStems] Failed to get upstreams - Response:', upstreamsResponse);
          return;
        }

        console.log(
          '✅ [fetchUpstreamsAndStems] Found upstreams:',
          upstreamsResponse.length,
          'items'
        );
        console.log('📋 [fetchUpstreamsAndStems] Upstreams data:', upstreamsResponse);
        setUpstreams(upstreamsResponse);

        // 3. 각 upstream에 대해 stem 정보 가져오기
        const stemPromises = upstreamsResponse.map(
          async (upstream: any, ) => {
            try {
              const stemResponse = await getUpstreamStems(
                upstream.id,
                currentTrackId
              );

              console.log('🔧 [stemPromise] Stem response for upstream', upstream.id, ':', stemResponse);
              console.log('🔧 [stemPromise] Stem response.data:', stemResponse.data);
              console.log('🔧 [stemPromise] Actual stem data:', stemResponse.data?.data);

              return {
                upstreamId: upstream.id,
                stemData: stemResponse.data?.success ? stemResponse.data.data : null,
              };
            } catch (error) {
              console.error('🔧 [stemPromise] Error getting stems for upstream', upstream.id, ':', error);
              return {
                upstreamId: upstream.id,
                stemData: null,
              };
            }
          }
        );

        const stemsResults = await Promise.all(stemPromises);
        setUpstreamStems(stemsResults);
      } catch (error) {
        console.error('❌ [fetchUpstreamsAndStems] Failed to fetch upstreams and stems:', error);
      }
    };

    // if (stageId) fetchUpstreamsAndStems();
    if (stageId) {
      console.log('🎬 useEffect triggered with stageId:', stageId);
      fetchUpstreamsAndStems();
    } else {
      console.log('⚠️ No stageId provided');
    }
  }, [stageId]);

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

      // 새 댓글을 로컬 상태에 추가
      const newComment: Comment = {
        id: response.id,
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
            user: comment.user
              ? {
                id: comment.user.id,
                username: comment.user.username,
              }
              : undefined,
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

  useEffect(() => {
    console.log('🔍 selectedUpstream:', selectedUpstream);
    if (selectedUpstream?.id) {
      console.log('🔍 loadComments:', selectedUpstream.id);
      loadComments(selectedUpstream.id);
    }
  }, [selectedUpstream, loadComments]);
  

  // 댓글 삭제 함수
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteUpstreamComment(commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
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

  const handleAudioFileClick = useCallback(
    async (upstream: any) => {
      try {
        console.log('🎵 Audio file clicked:', upstream);

        // 선택된 upstream 설정
        setSelectedUpstream(upstream);
        console.log('✅ Selected upstream set');

        // 해당 upstream의 댓글 로드
        console.log('💬 Loading comments for upstream:', upstream.id);
        await loadComments(upstream.id);

        // 스트리밍 최적화된 URL을 가져오기
        console.log('🌊 Getting streaming URL for upstream:', upstream.id);
        const response = await streamingService.getUpstreamStems(upstream.id);
        console.log('🌊 Streaming response:', response);

        // 타입 가드를 사용한 응답 처리
        if ('success' in response && response.success === false) {
          // 실패 응답 처리
          console.warn('⚠️ Streaming API failed:', response.message);
        } else if ('stems' in response && response.stems && Array.isArray(response.stems) && response.stems.length > 0) {
          // 성공 응답 처리
          const streamingUrl = response.stems[0].presignedUrl;
          console.log('✅ Using streaming URL:', streamingUrl);
          setExtraAudio(streamingUrl);
          setShowExtraWaveform(true);
          return; // 성공했으므로 함수 종료
        }

        // 스트리밍에 스템이 없거나 실패한 경우 - guide_path가 있으면 guide URL 사용
        console.warn('⚠️ No stems found, trying guide_path fallback');
        if (upstream.guide_path) {
          console.log('🔗 Using guide_path as fallback:', upstream.guide_path);
          try {
            const guideResponse = await streamingService.getUpstreamGuideStreamingUrl(upstream.id);
            if (guideResponse && guideResponse.success && guideResponse.data?.presignedUrl) {
              setExtraAudio(guideResponse.data.presignedUrl);
              setShowExtraWaveform(true);
            } else {
              console.warn('⚠️ No guide URL available');
              alert('No audio file available for this upstream');
            }
          } catch (guideError) {
            console.error('Error getting guide URL:', guideError);
            alert('No audio file available for this upstream');
          }
        } else {
          console.warn('⚠️ No guide_path available');
          alert('No audio file available for this upstream');
        }
      } catch (error) {
        console.error('Error loading streaming URL:', error);
        // 에러 발생 시에도 guide_path 시도
        if (upstream.guide_path) {
          try {
            const guideResponse = await streamingService.getUpstreamGuideStreamingUrl(upstream.id);
            if (guideResponse && guideResponse.success && guideResponse.data?.presignedUrl) {
              setExtraAudio(guideResponse.data.presignedUrl);
              setShowExtraWaveform(true);
            } else {
              alert('No audio file available for this upstream');
            }
          } catch (guideError) {
            console.error('Error getting guide URL as fallback:', guideError);
            alert('No audio file available for this upstream');
          }
        } else {
          alert('No audio file available for this upstream');
        }
      }
    },
    [loadComments]
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
    console.log('🔍 Selected Upstream:', selectedUpstream);

    if (!stageId || !selectedUpstream) {
      alert('Stage 또는 Upstream이 선택되지 않았습니다.');
      return;
    }

    try {
      await approveDropReviewer(stageId, selectedUpstream.id);
      alert('승인 완료!');
    } catch (error) {
      console.error('승인 실패:', error);
      alert('승인 중 오류 발생');
    }
  };

  const handleReject = async () => {
    if (!stageId || !selectedUpstream) {
      alert('Stage 또는 Upstream이 선택되지 않았습니다.');
      return;
    }

    try {
      await rejectDropReviewer(stageId, selectedUpstream.id);
      alert('거절 완료!');
    } catch (error) {
      console.error('거절 실패:', error);
      alert('거절 중 오류 발생');
    }
  };



  return (
    <div
      className='relative min-h-screen space-y-6 overflow-hidden bg-cover bg-center'
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      <div className='absolute inset-0 bg-black bg-opacity-80'>
        {/* Header */}
        <div className="bg-black px-6 py-4 flex items-center justify-between">
          <div className='flex items-center justify-between'>
            {/* 로고 */}
            <div className='flex items-center space-x-4'>
              <div className='flex items-center space-x-2'>
                <Button size="sm" className="p-2 bg-black text-white" onClick={() => navigate(`/stage/${stageId}`)}>
                  <ChevronLeft size={20} />
                </Button>
                <Logo />
              </div>
            </div>

            {/* 탭 버튼 */}
            <div className='flex items-center space-x-4'>
              <button
                onClick={handleApprove}
                className='border-b-2 bg-yellow-500 border-white pb-1 text-gray-300 hover:text-white'
              >
                APPROVE
              </button>
              <button
                onClick={handleReject}
                className='border-b-2 border-white pb-1 text-gray-300 bg-red-500 hover:text-white'
              >
                REJECT
              </button>
            </div>

            {/* 알림/설정 버튼 가로 정렬 */}
            <div className="flex items-center gap-4">
              <Button size="sm" className="p-2 bg-black text-white">
                <Bell size={20} />
              </Button>
              <Button size="sm" className="p-2 bg-black text-white">
                <Settings size={20} />
              </Button>
            </div>
          </div>
        </div>

        {/* 🔽 Header 아래로 이동된 버튼들 */}
        <div className='mt-4 flex justify-end space-x-4'>
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
              <h2 className='text-lg font-bold text-white'>
                Streaming Audio Files
              </h2>
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
                  <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-white'></div>
                </div>
              ) : (
                <div className='max-h-96 space-y-2 overflow-y-auto'>
                  {/* {upstreams.map((upstream, index) => {
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
                      </div> */}

                  {/* Stem 정보 표시 */}
                  {/* {stemInfo?.stemData && (
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
                })}  */}

                  {(() => {
                    console.log(
                      '🎨 Rendering upstreams. Total count:',
                      upstreams.length
                    );
                    console.log('🎨 Upstreams array:', upstreams);
                    console.log('🎨 UpstreamStems array:', upstreamStems);

                    if (upstreams.length === 0) {
                      console.log('⚠️ No upstreams to render');
                      return (
                        <div className='py-8 text-center text-gray-400'>
                          No audio files found for this stage
                        </div>
                      );
                    }

                    return upstreams.map((upstream, index) => {
                      console.log(
                        `🎨 Rendering upstream ${index + 1}:`,
                        upstream
                      );

                      // 해당 upstream의 stem 정보 찾기
                      const stemInfo = upstreamStems.find(
                        (s) => s.upstreamId === upstream.id
                      );
                      console.log(
                        `🎨 Stem info for upstream ${upstream.id}:`,
                        stemInfo
                      );

                      return (
                        <div key={index} className='space-y-2'>
                          <div
                            onClick={() => handleAudioFileClick(upstream)}
                            className='cursor-pointer rounded bg-[#3a3a3a] p-3 text-sm text-white transition-colors hover:bg-[#4a4a4a]'
                          >
                            <div className='font-medium'>
                              {upstream.title || 'Unnamed File'}
                            </div>
                            <div className='text-xs text-gray-400'>
                              {upstream.description || 'No description'}
                            </div>
                            <div className='mt-1 text-xs text-gray-500'>
                              Category: {upstream.category || 'Unknown'} | By:{' '}
                              {upstream.user?.username || 'Unknown'}
                            </div>
                          </div>

                          {/* Stem 정보 표시 */}
                          {stemInfo?.stemData && (
                            <div className='ml-4 space-y-1 rounded bg-[#2a2a2a] p-2 text-xs'>
                              <div className='font-medium text-blue-400'>
                                📁 Stems in this upstream:
                              </div>
                              {stemInfo.stemData.map(
                                (item: any, stemIndex: number) => (
                                  <div
                                    key={stemIndex}
                                    className='flex items-center justify-between'
                                  >
                                    <span className='text-white'>
                                      {item.category?.name ||
                                        'Unknown Category'}
                                      <span
                                        className={`ml-2 rounded px-2 py-1 text-xs ${item.type === 'new'
                                          ? 'bg-green-600'
                                          : item.type === 'modify'
                                            ? 'bg-yellow-600'
                                            : 'bg-gray-600'
                                          }`}
                                      >
                                        {item.type || 'unknown'}
                                      </span>
                                    </span>
                                    <span className='text-gray-400'>
                                      {item.stem?.file_name || 'Unknown file'}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
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
              <div className='mb-4 rounded bg-[#3a3a3a] p-3'>
                <div className='text-sm font-medium text-white'>
                  {selectedUpstream.title}
                </div>
                <div className='text-xs text-gray-400'>
                  {selectedUpstream.description}
                </div>
                <div className='mt-1 text-xs text-blue-400'>
                  by {selectedUpstream.user?.username}
                </div>
              </div>
            )}

            {!selectedUpstream && (
              <div className='mb-4 rounded bg-[#4a4a4a] p-3 text-center'>
                <div className='text-sm text-gray-300'>
                  Select an audio file to view comments
                </div>
              </div>
            )}

            {/* Comments List */}
            {commentsLoading ? (
              <div className='flex justify-center py-8'>
                <div className='h-6 w-6 animate-spin rounded-full border-b-2 border-white'></div>
              </div>
            ) : (
              <ul className='space-y-2 text-sm text-white'>
                {comments.map((comment) => (
                  <li
                    key={comment.id}
                    className='rounded p-2 hover:bg-[#3a3a3a]'
                  >
                    <div className='flex items-center justify-between'>
                      <div
                        className='flex flex-1 cursor-pointer items-center space-x-2'
                        onClick={() => seekToTime(comment.timeNumber)}
                      >
                        <span className='font-mono text-blue-400'>
                          {comment.timeString}
                        </span>
                        <span>🗨️</span>
                      </div>
                      {user && comment.user?.id === user.id && (
                        <div className='flex items-center space-x-1'>
                          <button
                            onClick={() => handleEditComment(comment)}
                            className='p-1 text-gray-400 hover:text-white'
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className='p-1 text-gray-400 hover:text-red-400'
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
                          className='w-full rounded bg-[#1a1a1a] px-2 py-1 text-xs text-white'
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
                      <div className='ml-6 text-gray-300'>
                        {comment.comment}
                        {comment.user && (
                          <div className='mt-1 text-xs text-gray-500'>
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
            <div className='flex items-center justify-center py-8'>
              <div className='mr-3 h-8 w-8 animate-spin rounded-full border-b-2 border-white'></div>
              <span className='text-white'>Loading guide...</span>
            </div>
          ) : guideLoadAttempted && guideAudioUrl ? (
            <Wave
              onReady={handleReady}
              audioUrl={guideAudioUrl}
              waveColor='#f87171'
              id='main'
              isPlaying={isPlaying}
              currentTime={currentTime}
              onSolo={handleMainSolo}
              isSolo={soloTrack === 'main'}
              onSeek={handleSeek}
            />
          ) : (
            <div className='flex items-center justify-center py-8'>
              <span className='text-sm text-white'>
                No guide audio available for this stage
              </span>
            </div>
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
            <Square size={20} />
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
              placeholder={
                selectedUpstream
                  ? 'Leave your comment...'
                  : 'Select an audio file to comment'
              }
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
              className={`${selectedUpstream && commentInput.trim()
                ? 'text-blue-400 hover:text-blue-300'
                : 'cursor-not-allowed text-gray-600'
                }`}
              onClick={handleAddComment}
              disabled={!selectedUpstream || !commentInput.trim()}
            >
              ▶️
            </button>
          </div>
          {selectedUpstream && (
            <div className='mt-2 text-center text-sm text-gray-400'>
              Commenting on: {selectedUpstream.title}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StemSetReviewPage;
