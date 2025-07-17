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

const StemSetReviewPage = () => {
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
  const [stemLoading, setStemLoading] = useState(false); // 개별 스템 로딩 상태 추가
  const [waveformLoading, setWaveformLoading] = useState(false); // waveform 데이터 로딩 상태 추가

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
            
            if (upstreamData.success && upstreamData.data?.upstream) {
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

  // 현재 버전의 가이드 스템 URL 가져오기
  useEffect(() => {
    const fetchGuideUrl = async () => {
      if (!stageId || !upstreamId) return;

      try {
        setGuideLoading(true);
        setGuideLoadAttempted(true); // 로드 시도 표시

        // 캐시 키 생성
        const cacheKey = `guide-${upstreamId}`;
        
        // 캐시에서 오디오 URL과 파형 데이터 확인
        const cachedAudioUrl = sessionStorage.getItem(`audio-${cacheKey}`);
        const cachedPeaks = sessionStorage.getItem(`peaks-${cacheKey}`);
        
        // 캐시된 데이터가 있으면 사용
        if (cachedAudioUrl) {
          console.log('📦 [fetchGuideUrl] Using cached guide audio URL');
          setGuideAudioUrl(cachedAudioUrl);
          
          if (cachedPeaks) {
            try {
              const parsedPeaks = JSON.parse(cachedPeaks);
              console.log('📦 [fetchGuideUrl] Using cached guide peaks data');
              setGuidePeaks(parsedPeaks);
              setGuideLoading(false);
              return; // 캐시된 데이터로 완료
            } catch (e) {
              console.warn('⚠️ Failed to parse cached guide peaks data:', e);
              // 파싱 오류 시 캐시 삭제
              sessionStorage.removeItem(`peaks-${cacheKey}`);
            }
          }
        }

        // 1. 현재 스테이지 정보 가져오기
        console.log('🔍 [fetchGuideUrl] Starting with stageId:', stageId);
        const currentStageResponse = await getStageDetail(stageId);
        
        if (!currentStageResponse || !currentStageResponse.success || !currentStageResponse.data) {
          console.error('❌ [fetchGuideUrl] Current stage not found - Response:', currentStageResponse);
          setGuideLoading(false);
          return;
        }

        // 2. guide audio URL 및 waveform 데이터 가져오기 (병렬 처리)
        const [audioResponse, waveformResponse] = await Promise.all([
          streamingService.getGuidePresignedUrlbyUpstream(upstreamId),
          streamingService.getGuideWaveformData(upstreamId),
        ]);

        // 오디오 URL 처리
        if (audioResponse.success && audioResponse.data) {
          const audioUrl = audioResponse.data.presignedUrl;
          setGuideAudioUrl(audioUrl);
          console.log('🎵 Guide audio URL set:', audioUrl);
          sessionStorage.setItem(`audio-${cacheKey}`, audioUrl);
        } else {
          console.warn('⚠️ Guide audio not available, using fallback');
          setGuideAudioUrl('/audio/track_ex.wav');
        }

        // 파형 데이터 처리
        if (waveformResponse.success && waveformResponse.data) {
          console.log('🌊 Guide waveform data type:', typeof waveformResponse.data);
          if (Array.isArray(waveformResponse.data)) {
            console.log('🌊 Guide waveform data is array with length:', waveformResponse.data.length);
          } else if (waveformResponse.data.data && Array.isArray(waveformResponse.data.data)) {
            console.log('🌊 Guide waveform data.data is array with length:', waveformResponse.data.data.length);
          }
          setGuidePeaks(waveformResponse.data);
          sessionStorage.setItem(`peaks-${cacheKey}`, JSON.stringify(waveformResponse.data));
        } else {
          console.warn('⚠️ Guide waveform data not available');
          setGuidePeaks(null);
        }
      } catch (error) {
        console.error('❌ [fetchGuideUrl] Error:', error);
        setGuideAudioUrl('/audio/track_ex.wav');
      } finally {
        setGuideLoading(false);
      }
    };

    fetchGuideUrl();
  }, [stageId, upstreamId]);

  // 스템 데이터 로드 함수 분리
  const loadStemsData = async (stageId: string, upstream: any) => {
    try {
      console.log('🎯 [loadStemsData] Loading stems for stageId:', stageId, 'upstream:', upstream.id);
      setStemsLoading(true);
      
      const stageResponse = await getStageDetail(stageId);
      
      if (!stageResponse || !stageResponse.success || !stageResponse.data) {
        console.error('❌ [loadStemsData] track 정보가 없습니다:', stageResponse);
        return;
      }
    
      const currentTrackId = stageResponse.data.track.id;
      console.log('🔍 currentTrackId:', currentTrackId);
      console.log('🔍 upstream:', upstream);
      
      // ✅ 단일 upstream에 대해서만 처리
      console.log('🎯 단일 upstream에 대해 getUpstreamStems 호출:', upstream.id);
      const stemResponse = await getUpstreamStems(currentTrackId, upstream.id);
      console.log('📦 [loadStemsData] Stem response:', stemResponse);
      console.log('📦 [loadStemsData] Stem response.data:', stemResponse?.data);
      console.log('📦 [loadStemsData] Stem response.data.data:', stemResponse?.data?.data);
      if(!stemResponse || !stemResponse.success || !stemResponse.data || !stemResponse.data.stems){
        console.log('❌ [loadStemsData] stem 정보가 없습니다:', stemResponse);
      } else {
        console.log('✅ [loadStemsData] stem 정보 있음. 데이터 길이:', stemResponse.data.stems?.length);
        console.log('✅ [loadStemsData] stem 정보 첫번째 아이템:', stemResponse.data.stems[0]);
      }
      
      const stemsResult = [
        {
          ...upstream,
          upstreamId: upstream.id,
          stemData: stemResponse?.data?.stems || null,
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
    // 현재 선택된 트랙과 같은 트랙을 다시 클릭하면 solo 모드 해제 (모든 트랙 재생)
    const newSoloTrack = soloTrack === trackId ? null : trackId;
    
    // 볼륨 업데이트
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];

    // 플레이어 존재 여부 확인
    if (!mainPlayer) {
      console.warn('🔊 Solo mode change failed: Main player not ready');
      return;
    }

    try {
      console.log(`🔊 Solo mode changing from ${soloTrack || 'all'} to ${newSoloTrack || 'all'}`);
      
      // 상태 업데이트
      setSoloTrack(newSoloTrack);

      // Solo 모드가 해제된 경우 모든 트랙 재생
      if (newSoloTrack === null) {
        mainPlayer.setVolume(volume);
        if (extraPlayer) extraPlayer.setVolume(volume);
        console.log('🔊 All tracks playing with volume:', volume);
        return;
      }

      // Solo 모드가 활성화된 경우 해당 트랙만 재생
      if (newSoloTrack === 'main') {
        // 메인 트랙만 재생
        mainPlayer.setVolume(volume);
        if (extraPlayer) {
          extraPlayer.setVolume(0); // 다른 트랙 음소거
          console.log('🔊 Main track solo activated, extra track muted');
        } else {
          console.log('🔊 Main track solo activated (extra track not available)');
        }
      } else if (newSoloTrack === 'extra' && extraPlayer) {
        // 엑스트라 트랙만 재생
        mainPlayer.setVolume(0); // 다른 트랙 음소거
        extraPlayer.setVolume(volume);
        console.log('🔊 Extra track solo activated, main track muted');
      } else {
        // 엑스트라 트랙이 없는 경우 오류 처리
        console.warn('🔊 Cannot solo extra track - not available');
        setSoloTrack('main'); // 메인으로 돌아가기
        mainPlayer.setVolume(volume);
      }
      
      // 상태 변경 후 로그 출력
      console.log(`🔊 Solo mode changed to: ${newSoloTrack || 'all tracks'}`);
    } catch (error) {
      console.error('🔊 Error setting solo mode:', error);
      // 오류 발생 시 기본값으로 돌아가기
      setSoloTrack('main');
      if (mainPlayer) mainPlayer.setVolume(volume);
    }
  }, [soloTrack, volume]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      setVolume(vol);

      // 볼륨 적용 로직 개선
      const mainPlayer = wavesurferRefs.current['main'];
      const extraPlayer = wavesurferRefs.current['extra'];

      // 플레이어 존재 여부 확인
      if (!mainPlayer && !extraPlayer) {
        console.warn('🔊 Volume change failed: No players available');
        return;
      }

      try {
        if (soloTrack === null) {
          // Solo 모드가 아닌 경우 모든 트랙에 볼륨 적용
          if (mainPlayer) mainPlayer.setVolume(vol);
          if (extraPlayer) extraPlayer.setVolume(vol);
          console.log('🔊 Volume changed for all tracks:', vol);
        } else {
          // Solo 모드인 경우 해당 트랙에만 볼륨 적용
          if (mainPlayer) mainPlayer.setVolume(soloTrack === 'main' ? vol : 0);
          if (extraPlayer) extraPlayer.setVolume(soloTrack === 'extra' ? vol : 0);
          console.log(`🔊 Volume changed for ${soloTrack} track:`, vol);
        }
      } catch (error) {
        console.error('🔊 Error setting volume:', error);
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
        setStemLoading(true);
        setWaveformLoading(true);

        // 선택된 upstream 설정 (댓글을 위해)
        setSelectedUpstream(upstream);
        setShowExtraWaveform(true);

        // 스템 ID를 기반으로 캐시 키 생성
        const stemId = stemData.stem?.id;
        const stemType = stemData.type;
        const cacheKey = `${stemType}-${stemId}`;
        
        // 캐시에서 오디오 URL 확인 (세션 스토리지 사용)
        const cachedUrl = sessionStorage.getItem(`audio-${cacheKey}`);
        const cachedPeaks = sessionStorage.getItem(`peaks-${cacheKey}`);
        
        // 캐시된 데이터가 있으면 사용
        if (cachedUrl) {
          console.log('📦 [handleIndividualStemClick] Using cached audio URL for:', cacheKey);
          setExtraAudio(cachedUrl);
          setStemLoading(false);
          
          if (cachedPeaks) {
            try {
              const parsedPeaks = JSON.parse(cachedPeaks);
              console.log('📦 [handleIndividualStemClick] Using cached peaks data');
              setExtraPeaks(parsedPeaks);
              setWaveformLoading(false);
              return; // 캐시된 데이터로 완료
            } catch (e) {
              console.warn('⚠️ Failed to parse cached peaks data:', e);
              // 파싱 오류 시 캐시 삭제
              sessionStorage.removeItem(`peaks-${cacheKey}`);
            }
          }
        }

        // 개별 스템의 스트리밍 URL 가져오기
        let streamingUrl = '';
        
        console.log('🔍 [handleIndividualStemClick] Stem data type:', stemData.type);
        console.log('🔍 [handleIndividualStemClick] Stem data:', stemData);
        
        if (stemData.type === 'unchanged' && stemData.stem?.id) {
          // version-stem API 사용 (version_stem 테이블)
          try {
            console.log('🔍 [handleIndividualStemClick] Using version-stem API for unchanged stem:', stemData.stem.id);
            const versionStemResponse = await streamingService.getVersionStemStreamingUrl(stemData.stem.id);
            console.log('🔍 [handleIndividualStemClick] Version stem response:', versionStemResponse);
            
            if (versionStemResponse.success && versionStemResponse.data?.presignedUrl) {
              streamingUrl = versionStemResponse.data.presignedUrl;
              console.log('✅ [handleIndividualStemClick] Version stem streaming URL obtained');
              // 캐시에 저장
              sessionStorage.setItem(`audio-${cacheKey}`, streamingUrl);
            } else {
              console.warn('⚠️ [handleIndividualStemClick] Version stem response not successful:', versionStemResponse);
              // 실패 시 일반 stem API로 fallback 시도
              try {
                console.log('🔄 [handleIndividualStemClick] Trying fallback to regular stem API');
                const fallbackResponse = await streamingService.getStemStreamingUrl(stemData.stem.id);
                if (fallbackResponse.success && fallbackResponse.data?.presignedUrl) {
                  streamingUrl = fallbackResponse.data.presignedUrl;
                  console.log('✅ [handleIndividualStemClick] Fallback successful');
                  // 캐시에 저장
                  sessionStorage.setItem(`audio-${cacheKey}`, streamingUrl);
                }
              } catch (fallbackError) {
                console.warn('Fallback also failed:', fallbackError);
              }
            }
          } catch (error: any) {
            console.warn('Version stem streaming failed:', error);
            console.warn('Error details:', error.response?.data);
            // 실패 시 일반 stem API로 fallback 시도
            try {
              console.log('🔄 [handleIndividualStemClick] Trying fallback to regular stem API after error');
              const fallbackResponse = await streamingService.getStemStreamingUrl(stemData.stem.id);
              if (fallbackResponse.success && fallbackResponse.data?.presignedUrl) {
                streamingUrl = fallbackResponse.data.presignedUrl;
                console.log('✅ [handleIndividualStemClick] Fallback successful after error');
                // 캐시에 저장
                sessionStorage.setItem(`audio-${cacheKey}`, streamingUrl);
              }
            } catch (fallbackError) {
              console.warn('Fallback also failed:', fallbackError);
            }
          }
        } else if ((stemData.type === 'new' || stemData.type === 'modify') && stemData.stem?.id) {
          // 일반 stem API 사용 (stem 테이블)
          try {
            console.log('🔍 [handleIndividualStemClick] Using regular stem API for new/modify stem:', stemData.stem.id);
            const stemResponse = await streamingService.getStemStreamingUrl(stemData.stem.id);
            console.log('🔍 [handleIndividualStemClick] Stem response:', stemResponse);
            
            if (stemResponse.success && stemResponse.data?.presignedUrl) {
              streamingUrl = stemResponse.data.presignedUrl;
              console.log('✅ [handleIndividualStemClick] Regular stem streaming URL obtained');
              // 캐시에 저장
              sessionStorage.setItem(`audio-${cacheKey}`, streamingUrl);
            } else {
              console.warn('⚠️ [handleIndividualStemClick] Stem response not successful:', stemResponse);
            }
          } catch (error: any) {
            console.warn('Regular stem streaming failed:', error);
            console.warn('Error details:', error.response?.data);
          }
        } else {
          console.warn('⚠️ [handleIndividualStemClick] Invalid stem data type or missing stem ID:', stemData);
        }

        // 개별 스템의 스트리밍 URL 및 waveform 데이터 가져오기 (병렬 처리)
        let streamingUrlPromise: Promise<any>;
        let waveformDataPromise: Promise<any>;

        if (stemData.type === 'unchanged' && stemData.stem?.id) {
          streamingUrlPromise = streamingService.getVersionStemStreamingUrl(stemData.stem.id);
          waveformDataPromise = streamingService.getVersionStemWaveformData(stemData.stem.id);
        } else if ((stemData.type === 'new' || stemData.type === 'modify') && stemData.stem?.id) {
          streamingUrlPromise = streamingService.getStemStreamingUrl(stemData.stem.id);
          waveformDataPromise = streamingService.getStemWaveformData(stemData.stem.id);
        } else {
          console.warn('⚠️ [handleIndividualStemClick] Invalid stem data type or missing stem ID:', stemData);
          showWarning('유효하지 않은 스템 데이터입니다.');
          setStemLoading(false);
          setWaveformLoading(false);
          return;
        }

        try {
          const [audioResponse, waveformResponse] = await Promise.all([
            streamingUrlPromise,
            waveformDataPromise,
          ]);

          // 오디오 URL 처리
          if (audioResponse.success && audioResponse.data?.presignedUrl) {
            const url = audioResponse.data.presignedUrl;
            setExtraAudio(url);
            sessionStorage.setItem(`audio-${cacheKey}`, url);
            console.log('✅ [handleIndividualStemClick] Streaming URL obtained:', url);
          } else {
            console.warn('⚠️ [handleIndividualStemClick] No streaming URL available for stem. Audio response:', audioResponse);
            showWarning('이 스템의 오디오 파일을 불러올 수 없습니다.');
            setExtraAudio(''); // 오디오 URL 초기화
          }

          // 파형 데이터 처리
          if (waveformResponse.success && waveformResponse.data) {
            setExtraPeaks(waveformResponse.data);
            sessionStorage.setItem(`peaks-${cacheKey}`, JSON.stringify(waveformResponse.data));
            console.log('📦 [handleIndividualStemClick] Waveform data loaded successfully');
          } else {
            console.warn('⚠️ [handleIndividualStemClick] No waveform data available for this stem. Waveform response:', waveformResponse);
            setExtraPeaks(null);
          }

        } catch (error) {
          console.error('❌ [handleIndividualStemClick] Error loading individual stem or waveform:', error);
          showError('스템을 불러오는 중 오류가 발생했습니다.');
          setExtraAudio('');
          setExtraPeaks(null);
        } finally {
          setStemLoading(false);
          setWaveformLoading(false);
        }
      } catch (error) {
        console.error('Error in handleIndividualStemClick outer try-catch:', error);
        showError('스템을 불러오는 중 오류가 발생했습니다.');
        setStemLoading(false);
        setWaveformLoading(false);
      }
    },
    [showWarning, showError]
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
      readyStates['main'] &&
      !isSeeking.current // 시크 중이 아닐 때만 동기화
    ) {
      try {
        // 현재 시간이 유효한 경우에만 동기화 시도
        if (currentTime > 0 && mainPlayer.getDuration() > 0) {
          const progress = currentTime / mainPlayer.getDuration();
          if (progress >= 0 && progress <= 1) {
            // 현재 위치와 extra 플레이어 위치가 너무 다를 때만 동기화 (성능 최적화)
            const extraTime = extraPlayer.getCurrentTime();
            if (Math.abs(extraTime - currentTime) > 0.1) {
              console.log('🔄 Syncing extra player to main time:', currentTime);
              extraPlayer.seekTo(progress);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Sync error:', error);
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
            onClick={() => {
              console.log('🔍 [Show History] Button clicked. Current state:', { 
                showHistory, 
                upstreamStems: upstreamStems.length,
                upstreamStemsData: upstreamStems,
                stageId,
                selectedUpstream,
                stemsLoading
              });
              console.log('🔍 [Show History] UpstreamStems detailed:', upstreamStems);
              setShowHistory(!showHistory);
            }}
            className={`self-start rounded px-3 py-1 text-sm transition-colors ${
              showHistory 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-[#3a3a3a] text-white hover:bg-[#555]'
            } ${upstreamStems.length === 0 ? 'opacity-50' : ''}`}
          >
            Show History {upstreamStems.length > 0 && `(${upstreamStems.length})`}
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
                  <span className='ml-2 text-white'>Loading stems...</span>
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
                    console.log('🎨 [Render] === RENDER START ===');
                    console.log('🎨 [Render] showHistory:', showHistory);
                    console.log('🎨 [Render] stemsLoading:', stemsLoading);
                    console.log('🎨 [Render] upstreamStems.length:', upstreamStems.length);
                    console.log('🎨 [Render] upstreamStems:', upstreamStems);
                    console.log('🎨 [Render] stageId:', stageId);
                    console.log('🎨 [Render] selectedUpstream:', selectedUpstream);
                    
                    // 스템 데이터 구조 상세 로깅
                    if (upstreamStems.length > 0) {
                      console.log('🎨 [Render] First upstream details:', upstreamStems[0]);
                      console.log('🎨 [Render] stemData exists:', !!upstreamStems[0]?.stemData);
                      console.log('🎨 [Render] stemData content:', upstreamStems[0]?.stemData);
                      if (upstreamStems[0]?.stemData) {
                        console.log('🎨 [Render] stemData is array:', Array.isArray(upstreamStems[0].stemData));
                        console.log('🎨 [Render] stemData length:', upstreamStems[0].stemData.length);
                      }
                    }

                    if (stemsLoading) {
                      console.log('🎨 [Render] Showing loading state');
                      return (
                        <div className='py-8 text-center text-gray-400'>
                          <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-white mx-auto mb-2'></div>
                          <span>Loading stems...</span>
                        </div>
                      );
                    }

                    if (upstreamStems.length === 0) {
                      console.log('⚠️ [Render] No upstreams to render');
                      return (
                        <div className='py-8 text-center text-gray-400'>
                          <div className="text-center space-y-2">
                            <div>No stems found for this upstream</div>
                            <div className="text-xs">
                              Debug: stageId={stageId}, selectedUpstream={selectedUpstream?.id}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // 개별 스템들만 렌더링 (폴더 형태가 아닌 평면적으로)
                    const allStems: any[] = [];
                    
                    upstreamStems.forEach((stemItem, upstreamIndex) => {
                      // 개별 스템들만 추가 (타입별 정렬: new -> modify -> unchanged)
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
                            sortOrder: stem.type === 'new' ? 0 : stem.type === 'modify' ? 1 : 2
                          });
                        });
                      }
                    });

                    return allStems.map((item, _index) => {
                      // 개별 스템 렌더링
                      const stemData = item.data;
                      const upstream = item.upstream;
                      
                      // 타입별 스타일 정의
                      const getTypeStyle = (type: string) => {
                        switch (type) {
                          case 'new':
                            return {
                              icon: '✨',
                              bgColor: 'bg-green-900/30',
                              borderColor: 'border-l-4 border-green-500',
                              badgeColor: 'bg-green-600 text-white',
                              hoverColor: 'hover:bg-green-900/50'
                            };
                          case 'modify':
                            return {
                              icon: '🔄',
                              bgColor: 'bg-yellow-900/30',
                              borderColor: 'border-l-4 border-yellow-500',
                              badgeColor: 'bg-yellow-600 text-white',
                              hoverColor: 'hover:bg-yellow-900/50'
                            };
                          case 'unchanged':
                            return {
                              icon: '📄',
                              bgColor: 'bg-gray-800/30',
                              borderColor: 'border-l-4 border-gray-500',
                              badgeColor: 'bg-gray-600 text-white',
                              hoverColor: 'hover:bg-gray-800/50'
                            };
                          default:
                            return {
                              icon: '❓',
                              bgColor: 'bg-gray-800/30',
                              borderColor: 'border-l-4 border-gray-500',
                              badgeColor: 'bg-gray-600 text-white',
                              hoverColor: 'hover:bg-gray-800/50'
                            };
                        }
                      };
                      
                      const typeStyle = getTypeStyle(stemData.type);
                      
                      return (
                        <div key={item.key} className='space-y-2'>
                          <div
                            onClick={() => handleIndividualStemClick(stemData, upstream)}
                            className={`cursor-pointer rounded p-3 text-sm text-white transition-all duration-200 ${typeStyle.bgColor} ${typeStyle.borderColor} ${typeStyle.hoverColor}`}
                          >
                            <div className='flex items-center justify-between'>
                              <div className='font-medium flex items-center gap-2'>
                                <span className="text-lg">{typeStyle.icon}</span>
                                <span>{stemData.category?.name || 'Unknown Category'}</span>
                              </div>
                              <span className={`rounded px-2 py-1 text-xs font-medium ${typeStyle.badgeColor}`}>
                                {stemData.type?.toUpperCase() || 'UNKNOWN'}
                              </span>
                            </div>
                            <div className='text-xs text-gray-300 mt-2'>
                              📁 {stemData.stem?.file_name || 'Unknown file'}
                            </div>
                            <div className='text-xs text-gray-400 mt-1'>
                              🎼 Instrument: {stemData.category?.instrument || 'Unknown'} | 
                              👤 By: {stemData.stem?.user?.username || upstream?.user?.username || 'Unknown'}
                            </div>
                          </div>
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
                <span className='ml-2 text-white'>Loading comments...</span>
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
            <div className='flex flex-col items-center justify-center py-8 bg-gray-900/30 rounded-md p-6'>
              <div className='mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-red-400'></div>
              <span className='text-white font-medium'>가이드 오디오를 불러오는 중...</span>
              <span className='text-gray-400 text-sm mt-2'>잠시만 기다려주세요</span>
            </div>
          ) : guideLoadAttempted && guideAudioUrl ? (
            <>
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
                isLoading={guideLoading}
              />
            </>
          ) : (
            <div className='flex items-center justify-center py-8 bg-gray-900/30 rounded-md p-6'>
              <span className='text-sm text-white'>
                이 스테이지에 사용 가능한 가이드 오디오가 없습니다.
              </span>
            </div>
          )}

          {showExtraWaveform && extraAudio && (
            <>
              {stemLoading ? (
                <div className='flex flex-col items-center justify-center py-8 bg-gray-900/30 rounded-md p-6'>
                  <div className='mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-400'></div>
                  <span className='text-white font-medium'>오디오 파일을 불러오는 중...</span>
                  <span className='text-gray-400 text-sm mt-2'>잠시만 기다려주세요</span>
                </div>
              ) : waveformLoading ? (
                <div className='flex flex-col items-center justify-center py-8 bg-gray-900/30 rounded-md p-6'>
                  <div className='mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-400'></div>
                  <span className='text-white font-medium'>파형 데이터를 불러오는 중...</span>
                  <span className='text-gray-400 text-sm mt-2'>잠시만 기다려주세요</span>
                  <div className='mt-4 text-xs text-gray-500'>
                    파형 데이터가 없으면 오디오만 로드됩니다.
                  </div>
                </div>
              ) : (
                <>
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
                    isLoading={stemLoading || waveformLoading}
                  />
                </>
              )}
            </>
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
              <Play size={20} />
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