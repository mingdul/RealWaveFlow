import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Wave from '../components/wave';
import Logo from '../components/Logo';
import {
  getUpstreamStems,
  getUpstreamByUpstreamId,
} from '../services/upstreamService';
import { getStageDetail } from '../services/stageService';
import streamingService from '../services/streamingService';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  approveDropReviewer,
  rejectDropReviewer,
} from '../services/upstreamReviewService';
import { useNavigate } from 'react-router-dom';
import { getDisplayFilename } from '../utils/filenameUtils';
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
  X,
  MoreVertical,
  MessageCircle,
  Volume2,
} from 'lucide-react';
// import { ActionButton, StatusBadge } from '../components/ui';
import { theme } from '../styles/theme';

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

const StemSetReview = () => {
  const { user } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const navigate = useNavigate();

  // 전역 에러 핸들러 설정
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Error handler
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Promise rejection handler
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  // const wavesurferRef = useRef<any>(null);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soloTrack, setSoloTrack] = useState<'main' | 'extra'>('main'); // 초기에는 guide(main)만 소리 나게
  // 새로운 UI 상태 관리
  const [activePanel, setActivePanel] = useState<any>('none');
  const [floatingComments, setFloatingComments] = useState<any[]>([]); // 떠다니는 댓글
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const [commentPosition, setCommentPosition] = useState({ x: 0, time: 0 });
  const [newCommentText, setNewCommentText] = useState('');

  // 새로운 호버 기반 댓글 시스템
  const [hoveredPosition, setHoveredPosition] = useState<{ x: number; time: number } | null>(null);
  const [isInlineCommentOpen, setIsInlineCommentOpen] = useState(false);
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
  const [stageInfo, setStageInfo] = useState<any>(null); // Stage 정보 상태 추가

  const wavesurferRefs = useRef<{ [id: string]: WaveSurfer }>({});
  const [readyStates, setReadyStates] = useState<{ [id: string]: boolean }>({});

  const isSeeking = useRef(false); // 무한 루프 방지용 플래그
  const debugRef = useRef({ lastLog: 0, lastState: '' }); // 렌더링 로그 최적화용
  const { upstreamId } = useParams<{
    upstreamId: string;
  }>();
  const [searchParams] = useSearchParams();
  const urlStageId = searchParams.get('stageId');
  const [stageId, setStageId] = useState<string | undefined>(urlStageId || undefined);

  // stageId 결정 로직 (쿼리 파라미터 우선, 없으면 upstream API 사용)
  useEffect(() => {
    const determineStageId = async () => {
      // 쿼리 파라미터에 stageId가 있으면 바로 사용
      if (urlStageId) {
        setStageId(urlStageId);

        // stageId가 있어도 upstreamId로 upstream 정보를 가져와서 selectedUpstream 설정
        if (upstreamId) {
          try {
            const upstreamData = await getUpstreamByUpstreamId(upstreamId);

            if (upstreamData.success && upstreamData.data?.upstream) {
              setSelectedUpstream(upstreamData.data.upstream);
            }
          } catch (error) {
            // Error handling
          }
        }
        return;
      }

      // URL에서 stageId가 없는 경우에만 upstream에서 추출
      if (upstreamId) {
        try {
          // upstream 정보를 가져와서 stageId 추출
          const upstreamData = await getUpstreamByUpstreamId(upstreamId);

          if (upstreamData.success && upstreamData.data?.upstream) {
            // stage 정보가 있는지 확인
            if (upstreamData.data.upstream.stage) {
              const extractedStageId = upstreamData.data.upstream.stage.id;
              setStageId(extractedStageId); // stageId state 업데이트
            }

            // 선택된 upstream 설정
            setSelectedUpstream(upstreamData.data.upstream);

            // stageId가 설정되었으므로 즉시 스템 데이터 로드 (함수 정의 후에 호출)
          }
        } catch (error) {
          // Error handling
        }
        return;
      }
    };

    determineStageId();
  }, [upstreamId, urlStageId]);



  // 현재 버전의 가이드 스템 URL 가져오기
  useEffect(() => {
    const fetchGuideUrl = async () => {
      if (!stageId || !upstreamId) {
        return;
      }

      // 타임아웃 설정 (15초)
      const timeoutId = setTimeout(() => {
        setGuideLoading(false);
        showError('로딩 시간이 초과되었습니다. 새로고침 후 다시 시도해주세요.');
      }, 15000);

      try {
        setGuideLoading(true);
        setGuideLoadAttempted(true);

        // 캐시 키 생성
        const cacheKey = `guide-${upstreamId}`;

        // 임시: 항상 새로운 데이터를 가져오도록 캐시 클리어 (presigned URL 만료 문제 해결)
        sessionStorage.removeItem(`audio-${cacheKey}`);
        sessionStorage.removeItem(`peaks-${cacheKey}`);

        // 1. 현재 스테이지 정보 가져오기
        const currentStageResponse = await getStageDetail(stageId);

        // 응답 구조 검증 강화
        if (!currentStageResponse) {
          throw new Error('Stage API returned null response');
        }

        if (!currentStageResponse.success) {
          throw new Error(
            `Stage API failed: ${currentStageResponse.message || 'Unknown error'}`
          );
        }

        if (!currentStageResponse.data) {
          throw new Error('Stage API returned no data');
        }

        // 2. guide audio URL 및 waveform 데이터 가져오기 (병렬 처리)
        const [audioResponse, waveformUrlResponse] = await Promise.all([
          streamingService.getUpstreamGuideStreamingUrl(upstreamId),
          streamingService.getGuideWaveformPresignedUrl(upstreamId),
        ]);

        // 오디오 URL 처리 - 응답 구조 검증 강화
        if (audioResponse?.success && audioResponse.data?.presignedUrl) {
          const audioUrl = audioResponse.data.presignedUrl;
          if (typeof audioUrl === 'string' && audioUrl.length > 0) {
            setGuideAudioUrl(audioUrl);
            sessionStorage.setItem(`audio-${cacheKey}`, audioUrl);
          } else {
            throw new Error('Invalid audio URL format received');
          }
        } else {
          setGuideAudioUrl('/audio/track_ex.wav');
          showWarning(
            '가이드 오디오를 불러올 수 없어 기본 오디오를 사용합니다.'
          );
        }

        // 파형 데이터 처리 - presigned URL로 실제 JSON 데이터 다운로드
        if (
          waveformUrlResponse?.success &&
          waveformUrlResponse.data?.presignedUrl
        ) {
          const waveformDataResponse =
            await streamingService.downloadWaveformData(
              waveformUrlResponse.data.presignedUrl
            );

          if (waveformDataResponse?.success && waveformDataResponse.data) {
            const waveformData = waveformDataResponse.data;

            // 파형 데이터 유효성 검사 - peaks 배열이나 {peaks: array} 구조 확인
            if (
              Array.isArray(waveformData) ||
              (waveformData.peaks && Array.isArray(waveformData.peaks))
            ) {
              setGuidePeaks(waveformData);
              sessionStorage.setItem(
                `peaks-${cacheKey}`,
                JSON.stringify(waveformData)
              );
            } else {
              setGuidePeaks(null);
            }
          } else {
            setGuidePeaks(null);
          }
        } else {
          setGuidePeaks(null);
        }
      } catch (error) {
        // 에러 타입별 처리
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';

        if (
          errorMessage.includes('timeout') ||
          errorMessage.includes('Network')
        ) {
          showError('네트워크 연결을 확인하고 다시 시도해주세요.');
        } else if (
          errorMessage.includes('401') ||
          errorMessage.includes('403')
        ) {
          showError('권한이 없습니다. 다시 로그인해주세요.');
        } else if (errorMessage.includes('404')) {
          showError('요청한 데이터를 찾을 수 없습니다.');
        } else {
          showError('가이드 오디오를 불러오는 중 오류가 발생했습니다.');
        }

        // 폴백 처리
        setGuideAudioUrl('/audio/track_ex.wav');
        setGuidePeaks(null);
      } finally {
        clearTimeout(timeoutId);
        setGuideLoading(false);
      }
    };

    fetchGuideUrl();
  }, [stageId, upstreamId, showError, showWarning]);

  // 강제로 guideLoading 상태 해제 - API 호출이 성공했는데도 로딩이 계속되는 문제 해결
  useEffect(() => {
    if (guideAudioUrl && guidePeaks && guideLoading) {
      setGuideLoading(false);
    }
  }, [guideAudioUrl, guidePeaks, guideLoading]);

  // 타이머 기반 강제 로딩 해제 - 5초 후에도 로딩 중이면 강제 해제
  useEffect(() => {
    if (guideLoading) {
      const forceStopTimer = setTimeout(() => {
        if (guideLoading) {
          setGuideLoading(false);
        }
      }, 5000);

      return () => clearTimeout(forceStopTimer);
    }
  }, [guideLoading]);

  // 스템 데이터 로드 함수 분리
  const loadStemsData = async (stageId: string, upstream: any) => {
    // 타임아웃 설정 (15초)
    const timeoutId = setTimeout(() => {
      setStemsLoading(false);
      showError('스템 데이터 로딩 시간이 초과되었습니다.');
    }, 15000);

    try {
      setStemsLoading(true);

      // 입력 검증
      if (!stageId || !upstream?.id) {
        throw new Error('Missing required parameters for stems loading');
      }

      // 1. 스테이지 정보 가져오기
      const stageResponse = await getStageDetail(stageId);

      // 응답 구조 검증
      if (!stageResponse) {
        throw new Error('Stage API returned null response');
      }

      if (!stageResponse.success) {
        throw new Error(
          `Stage API failed: ${stageResponse.message || 'Unknown error'}`
        );
      }

      if (!stageResponse.data?.track?.id) {
        throw new Error('Stage response missing track ID');
      }

      const currentTrackId = stageResponse.data.track.id;
      
      // Stage 정보 저장
      setStageInfo(stageResponse.data);

      // 2. 스템 정보 가져오기
      const stemResponse = await getUpstreamStems(currentTrackId, upstream.id);

      // 스템 응답 구조 검증
      if (!stemResponse) {
        throw new Error('Stems API returned null response');
      }

      if (!stemResponse.success) {
        // 스템이 없는 경우는 에러가 아님
      }

      const stemData = stemResponse?.data?.data || null;

      // 3. 결과 구성
      const stemsResult = [
        {
          ...upstream,
          upstreamId: upstream.id,
          stemData: stemData,
        },
      ];

      setUpstreamStems(stemsResult);
    } catch (error) {
      // 에러 타입별 처리
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('Network')
      ) {
        showError('네트워크 연결을 확인하고 다시 시도해주세요.');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        showError('권한이 없습니다. 다시 로그인해주세요.');
      } else if (errorMessage.includes('404')) {
        showError('요청한 스테이지 또는 스템 정보를 찾을 수 없습니다.');
      } else if (errorMessage.includes('Missing required parameters')) {
        showError('필수 정보가 부족합니다. 페이지를 새로고침해주세요.');
      } else {
        showError('스템 정보를 불러오는 중 오류가 발생했습니다.');
      }

      // 빈 결과로 설정 (에러 상태로 두지 않음)
      setUpstreamStems([]);
    } finally {
      clearTimeout(timeoutId);
      setStemsLoading(false);
    }
  };

  useEffect(() => {
    // stageId와 selectedUpstream이 모두 설정되면 스템 데이터 로드
    if (stageId && selectedUpstream) {
      loadStemsData(stageId, selectedUpstream);
    }
  }, [stageId, selectedUpstream]);

  const handleReady = useCallback(
    (ws: WaveSurfer, id: string) => {
      try {
        wavesurferRefs.current[id] = ws;

        // ready 상태 업데이트
        setReadyStates((prev) => {
          if (prev[id] === true) {
            return prev;
          }
          return { ...prev, [id]: true };
        });

        // main 파형이 ready 되었을 때 이벤트 리스너 추가 (한 번만)
        if (id === 'main') {
          ws.on('audioprocess', (time: number) => {
            setCurrentTime(time);
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

          // duration 설정 (즉시)
          const duration = ws.getDuration();
          if (duration > 0) {
            setDuration(duration);
          }
        }

      } catch (error: any) {
        // Error handling
      }
    },
    [] // dependencies 제거로 재생성 방지
  );

  const togglePlay = useCallback(() => {
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];

    if (mainPlayer && readyStates['main']) {
      try {
        if (isPlaying) {
          // 재생 중인 모든 플레이어 일시 정지
          mainPlayer.pause();

          if (extraPlayer && readyStates['extra']) {
            try {
              extraPlayer.pause();
            } catch (error: any) {
              // Error handling
            }
          }
        } else {
          // 모든 준비된 플레이어 재생
          mainPlayer.play();

          if (extraPlayer && readyStates['extra']) {
            try {
              extraPlayer.play();
            } catch (error: any) {
              // Error handling
            }
          }
        }
      } catch (error: any) {
        // Error handling
      }
    }
  }, [isPlaying, readyStates]);

  // \uc2a4\ud398\uc774\uc2a4\ubc14 \uc7ac\uc0dd/\uc77c\uc2dc\uc815\uc9c0 \ud0a4\ubcf4\ub4dc \uc774\ubca4\ud2b8
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // \uc785\ub825 \ud544\ub4dc\uc5d0 \ud3ec\ucee4\uc2a4\uac00 \uc788\uc744 \ub54c\ub294 \ubc29\uc9c0
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        // 5\ucd08 \ub4a4\ub85c \uc774\ub3d9
        const newTime = Math.max(0, currentTime - 5);
        const mainPlayer = wavesurferRefs.current['main'];
        const extraPlayer = wavesurferRefs.current['extra'];
        if (mainPlayer && mainPlayer.getDuration()) {
          const progress = newTime / mainPlayer.getDuration();
          mainPlayer.seekTo(progress);
          if (extraPlayer && extraPlayer.getDuration()) {
            extraPlayer.seekTo(progress);
          }
          setCurrentTime(newTime);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        // 5\ucd08 \uc55e\uc73c\ub85c \uc774\ub3d9
        const newTime = Math.min(duration, currentTime + 5);
        const mainPlayer = wavesurferRefs.current['main'];
        const extraPlayer = wavesurferRefs.current['extra'];
        if (mainPlayer && mainPlayer.getDuration()) {
          const progress = newTime / mainPlayer.getDuration();
          mainPlayer.seekTo(progress);
          if (extraPlayer && extraPlayer.getDuration()) {
            extraPlayer.seekTo(progress);
          }
          setCurrentTime(newTime);
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        // \ubcfc\ub968 \uc99d\uac00
        const newVolume = Math.min(1, volume + 0.1);
        setVolume(newVolume);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        // \ubcfc\ub968 \uac10\uc18c
        const newVolume = Math.max(0, volume - 0.1);
        setVolume(newVolume);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, currentTime, duration, volume]);


  // 파형 마우스 이동 이벤트 - 호버 위치 감지
  const handleWaveformMouseMove = useCallback((event: React.MouseEvent) => {
    if (!selectedUpstream || !waveformContainerRef.current || isInlineCommentOpen) return;

    const rect = waveformContainerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const progress = x / rect.width;
    const time = progress * duration;

    setHoveredPosition({ x, time });
  }, [selectedUpstream, duration, isInlineCommentOpen]);

  // 파형에서 마우스가 벗어날 때
  const handleWaveformMouseLeave = useCallback(() => {
    setHoveredPosition(null);
  }, []);

  // 댓글 아이콘 클릭
  const handleCommentIconClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation(); // 파형 클릭 이벤트와 겹치지 않도록
    if (!hoveredPosition) return;

    setCommentPosition({ x: hoveredPosition.x, time: hoveredPosition.time });
    setIsInlineCommentOpen(true);
    setHoveredPosition(null);
  }, [hoveredPosition]);

  // 댓글 추가 완료
  const handleAddComment = useCallback(async () => {
    if (!newCommentText.trim() || !user || !selectedUpstream) return;

    const timeString = `${String(Math.floor(commentPosition.time / 60)).padStart(2, '0')}:${String(Math.floor(commentPosition.time % 60)).padStart(2, '0')}`;

    try {
      const commentData = {
        comment: newCommentText.trim(),
        time: timeString,
        upstream_id: selectedUpstream.id,
        user_id: user.id,
      };

      const response = await createUpstreamComment(commentData);
      const createdComment = response.upstream_comment || response;

      const newComment: Comment = {
        id: createdComment.id,
        time: timeString,
        comment: newCommentText.trim(),
        timeNumber: commentPosition.time,
        timeString: timeString,
        user: {
          id: user.id,
          username: user.username,
        },
      };

      setComments((prev) => [...prev, newComment]);
      setNewCommentText('');
      setIsInlineCommentOpen(false);
      showSuccess('댓글이 추가되었습니다!');
    } catch (error) {
      showError('댓글 추가 중 오류가 발생했습니다.');
    }
  }, [newCommentText, commentPosition, user, selectedUpstream, showSuccess, showError]);

  // 인라인 댓글 닫기
  const handleCloseInlineComment = useCallback(() => {
    setIsInlineCommentOpen(false);
    setNewCommentText('');
  }, []);

  // 재생 중 댓글 표시 로직 - SoundCloud 스타일 프로그레스바 기반
  useEffect(() => {
    if (!isPlaying) {
      setFloatingComments([]);
      return;
    }

    if (comments.length === 0) {
      setFloatingComments([]);
      return;
    }

    // SoundCloud 스타일: 프로그레스바가 댓글 위치에 도달할 때 표시
    const triggeredComments = comments.filter(comment => {
      const timeDiff = currentTime - comment.timeNumber;
      const shouldShow = timeDiff >= 0 && timeDiff <= 0.2;
      return shouldShow;
    });

    if (triggeredComments.length > 0) {
      setFloatingComments(triggeredComments.map((comment, index) => ({
        ...comment,
        id: `floating-${comment.id}-${Math.floor(currentTime * 10)}`,
        position: duration > 0 ? comment.timeNumber / duration : 0,
        delay: index * 100,
      })));

      // SoundCloud 스타일: 3초 후 자동 제거
      const timer = setTimeout(() => {
        setFloatingComments([]);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentTime, isPlaying, comments, duration]);

  const stopPlayback = useCallback(() => {
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];

    try {
      if (mainPlayer && readyStates['main']) {
        mainPlayer.stop();
      }

      if (extraPlayer && readyStates['extra']) {
        try {
          extraPlayer.stop();
        } catch (error: any) {
          // Error handling
        }
      }
    } catch (error: any) {
      // Error handling
    }

    setIsPlaying(false);
  }, [readyStates]);

  // 볼륨 적용 헬퍼 함수 - 안전한 볼륨 조절

  const handleSolo = useCallback(
    (trackId: 'main' | 'extra') => {
      // 같은 트랙이 이미 솔로 중이면 무시 (불필요한 업데이트 방지)
      if (soloTrack === trackId) {
        return;
      }

      const mainPlayer = wavesurferRefs.current['main'];
      const extraPlayer = wavesurferRefs.current['extra'];

      // 엄격한 준비 상태 체크
      if (!mainPlayer || !readyStates['main']) {
        showWarning(
          '메인 플레이어가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.'
        );
        return;
      }

      // extra 트랙 솔로 시 준비 상태 확인
      if (trackId === 'extra') {
        if (!extraPlayer || !readyStates['extra']) {
          showWarning(
            '선택한 스템이 준비되지 않았습니다. 스템을 먼저 로드해주세요.'
          );
          return;
        }
      }

      try {
        // 상태 업데이트만 하고 useEffect에서 볼륨 적용을 처리
        setSoloTrack(trackId);
      } catch (error) {
        showError('Solo 기능 실행 중 오류가 발생했습니다.');

        // 오류 발생 시 안전한 상태로 복구 (기본값: main)
        try {
          setSoloTrack('main');
        } catch (recoveryError) {
          // Error handling
        }
      }
    },
    [soloTrack, readyStates, showWarning, showError]
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);

      // 볼륨 값 유효성 검사
      if (isNaN(vol) || vol < 0 || vol > 1) {
        return;
      }

      setVolume(vol);
      // volume 상태 변경은 useEffect(volume 의존성)에서 자동으로 볼륨 적용 처리
    },
    []
  );


  // 댓글 로드 함수
  const loadComments = useCallback(async (upstreamId: string) => {
    try {
      setCommentsLoading(true);
      const response = await getUpstreamComments(upstreamId);

      // API 응답 구조에 맞게 수정: upstreamComments 배열 사용
      const commentsData = response.upstreamComments || response.data || [];

      if (commentsData && Array.isArray(commentsData)) {
        const formattedComments = commentsData.map((comment: any) => {
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
      } else {
        setComments([]);
      }
    } catch (error) {
      showError('댓글을 불러오는 중 오류가 발생했습니다.');
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUpstream?.id) {
      loadComments(selectedUpstream.id);
    }
  }, [selectedUpstream, loadComments]);

  // 댓글 삭제 함수
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteUpstreamComment(commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (error) {
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
        showError('댓글 수정 중 오류가 발생했습니다.');
      }
    },
    [editCommentText, comments]
  );

  // 댓글 클릭 시 해당 시간으로 이동 (모든 스템 동기화)
  const seekToTime = useCallback((time: number) => {
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];

    if (mainPlayer && mainPlayer.getDuration()) {
      const progress = time / mainPlayer.getDuration();

      // 모든 플레이어를 동기화
      mainPlayer.seekTo(progress);

      if (extraPlayer && extraPlayer.getDuration()) {
        extraPlayer.seekTo(progress);
      }

      // currentTime 상태도 업데이트
      setCurrentTime(time);
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

      if (mainPlayer && readyStates['main']) {
        try {
          const progress = time / mainPlayer.getDuration();
          if (progress >= 0 && progress <= 1) {
            // main 트랙에서 seek가 발생하면 extra 트랙을 동기화
            if (trackId === 'main') {
              if (extraPlayer && readyStates['extra']) {
                try {
                  extraPlayer.seekTo(progress);
                } catch (error: any) {
                  if (error.name !== 'AbortError') {
                    // Extra player seek error
                  }
                }
              }
            }
            // extra 트랙에서 seek가 발생하면 main 트랙을 동기화
            else if (trackId === 'extra' && readyStates['extra']) {
              try {
                mainPlayer.seekTo(progress);
              } catch (error: any) {
                if (error.name !== 'AbortError') {
                  // Main player seek error
                }
              }
            }
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            // Seek synchronization error
          }
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
      // 타임아웃 설정 (20초)
      const timeoutId = setTimeout(() => {
        setStemLoading(false);
        setWaveformLoading(false);
        showError('스템 로딩 시간이 초과되었습니다. 다시 시도해주세요.');
      }, 20000);

      try {
        setStemLoading(true);
        setWaveformLoading(true);

        // 유효성 검사 강화
        if (!stemData?.stem?.id) {
          throw new Error('Invalid stem data: missing stem ID');
        }

        if (!['new', 'modify', 'unchanged'].includes(stemData.type)) {
          throw new Error(`Unknown stem type: ${stemData.type}`);
        }

        // 선택된 upstream 설정
        setSelectedUpstream(upstream);
        setShowExtraWaveform(true);

        // 캐시 키 생성
        const stemId = stemData.stem.id;
        const stemType = stemData.type;
        const cacheKey = `${stemType}-${stemId}`;

        // 캐시된 데이터 확인
        const cachedUrl = sessionStorage.getItem(`audio-${cacheKey}`);
        const cachedPeaks = sessionStorage.getItem(`peaks-${cacheKey}`);

        if (cachedUrl) {
          setExtraAudio(cachedUrl);
          setStemLoading(false);

          if (cachedPeaks) {
            try {
              const parsedPeaks = JSON.parse(cachedPeaks);
              setExtraPeaks(parsedPeaks);
              setWaveformLoading(false);
              clearTimeout(timeoutId);
              return;
            } catch (parseError) {
              sessionStorage.removeItem(`peaks-${cacheKey}`);
            }
          }
          setWaveformLoading(false);
        }

        // API 호출 함수 결정
        const getApiCalls = () => {
          if (stemData.type === 'unchanged') {
            return [
              () => streamingService.getVersionStemStreamingUrl(stemId),
              () => streamingService.getVersionStemWaveformData(stemId),
            ];
          } else {
            return [
              () => streamingService.getStemStreamingUrl(stemId),
              () => streamingService.getStemWaveformData(stemId),
            ];
          }
        };

        const [getStreamingUrl, getWaveformData] = getApiCalls();

        // 순차적으로 API 호출 (병렬 처리 시 경쟁 상태 방지)
        let audioResponse: any;
        let waveformResponse: any;

        try {
          audioResponse = await getStreamingUrl();
        } catch (audioError) {
          audioResponse = { success: false, error: audioError };
        }

        try {
          waveformResponse = await getWaveformData();
        } catch (waveformError) {
          waveformResponse = { success: false, error: waveformError };
        }

        // 오디오 URL 처리 - 응답 구조 검증 강화
        if (audioResponse?.success && audioResponse.data?.presignedUrl) {
          const audioUrl = audioResponse.data.presignedUrl;

          if (typeof audioUrl === 'string' && audioUrl.length > 0) {
            setExtraAudio(audioUrl);
            sessionStorage.setItem(`audio-${cacheKey}`, audioUrl);
          } else {
            throw new Error('Invalid audio URL format');
          }
        } else {
          setExtraAudio('');
          showWarning('이 스템의 오디오 파일을 불러올 수 없습니다.');
        }

        // 파형 데이터 처리 - 응답 구조 검증 강화
        if (waveformResponse?.success && waveformResponse.data) {
          const waveformData = waveformResponse.data;

          // 파형 데이터 유효성 검사 - peaks 배열이나 {peaks: array} 구조 확인
          if (
            Array.isArray(waveformData) ||
            (waveformData.peaks && Array.isArray(waveformData.peaks)) ||
            (waveformData.data && Array.isArray(waveformData.data))
          ) {
            setExtraPeaks(waveformData);
            sessionStorage.setItem(
              `peaks-${cacheKey}`,
              JSON.stringify(waveformData)
            );
          } else {
            setExtraPeaks(null);
          }
        } else {
          setExtraPeaks(null);
        }
      } catch (error) {
        // 에러 타입별 처리
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        if (
          errorMessage.includes('timeout') ||
          errorMessage.includes('Network')
        ) {
          showError('네트워크 연결을 확인하고 다시 시도해주세요.');
        } else if (
          errorMessage.includes('401') ||
          errorMessage.includes('403')
        ) {
          showError('권한이 없습니다. 다시 로그인해주세요.');
        } else if (errorMessage.includes('404')) {
          showError('선택한 스템을 찾을 수 없습니다.');
        } else if (errorMessage.includes('Invalid stem data')) {
          showError('유효하지 않은 스템 데이터입니다.');
        } else if (errorMessage.includes('Unknown stem type')) {
          showError('지원하지 않는 스템 타입입니다.');
        } else {
          showError('스템을 불러오는 중 오류가 발생했습니다.');
        }

        // 폴백 처리
        setExtraAudio('');
        setExtraPeaks(null);
        setShowExtraWaveform(false);
      } finally {
        clearTimeout(timeoutId);
        setStemLoading(false);
        setWaveformLoading(false);
      }
    },
    [showWarning, showError]
  );

  // Solo 버튼 핸들러들을 메모이제이션 (stable references)
  const handleMainSolo = useCallback(() => handleSolo('main'), [handleSolo]);
  const handleExtraSolo = useCallback(() => handleSolo('extra'), [handleSolo]);

  // Memoize other callback functions to prevent re-renders
  const memoizedTogglePlay = useCallback(togglePlay, [isPlaying, readyStates]);
  const memoizedStopPlayback = useCallback(stopPlayback, [readyStates]);
  const memoizedVolumeChange = useCallback(handleVolumeChange, []);

  // soloTrack 또는 volume 상태 변경 시 볼륨 적용 (최적화된 버전)
  useEffect(() => {
    // 메인 플레이어가 준비되지 않은 경우 스킵
    if (!readyStates['main'] || volume === undefined) {
      return;
    }

    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];

    // 볼륨 설정 헬퍼 함수 (에러 처리 포함)
    const safeSetVolume = (
      player: any,
      vol: number,
      name: string,
      id: string
    ) => {
      if (!player || !readyStates[id]) {
        return;
      }

      try {
        const currentVolume = player.getVolume();
        // 볼륨이 이미 같다면 설정하지 않음 (불필요한 호출 방지)
        if (Math.abs(currentVolume - vol) < 0.01) {
          return;
        }

        player.setVolume(vol);
      } catch (error: any) {
        if (
          error.name !== 'AbortError' &&
          !error.message?.includes('destroyed')
        ) {
          // Volume setting error
        }
      }
    };

    // Solo 모드에 따른 볼륨 적용
    if (soloTrack === 'main') {
      safeSetVolume(mainPlayer, volume, 'main', 'main');
      safeSetVolume(extraPlayer, 0, 'extra', 'extra');
    } else if (soloTrack === 'extra' && readyStates['extra']) {
      safeSetVolume(mainPlayer, 0, 'main', 'main');
      safeSetVolume(extraPlayer, volume, 'extra', 'extra');
    }
  }, [volume, soloTrack, readyStates]);

  // 동기화를 위한 debounced seek (과도한 seek 방지)
  const lastSyncTime = useRef<number>(0);
  useEffect(() => {
    const extraPlayer = wavesurferRefs.current['extra'];
    const mainPlayer = wavesurferRefs.current['main'];

    // 재생 중이고 both players ready일 때만 동기화
    if (
      isPlaying &&
      extraPlayer &&
      mainPlayer &&
      readyStates['extra'] &&
      readyStates['main']
    ) {
      const now = Date.now();
      // 100ms 간격으로 동기화 (과도한 호출 방지)
      if (now - lastSyncTime.current > 100) {
        try {
          const duration = mainPlayer.getDuration();
          if (duration > 0) {
            const progress = currentTime / duration;
            if (progress >= 0 && progress <= 1) {
              const extraCurrentTime = extraPlayer.getCurrentTime();
              const timeDiff = Math.abs(extraCurrentTime - currentTime);

              // 시간 차이가 0.2초 이상일 때만 동기화
              if (timeDiff > 0.2) {
                extraPlayer.seekTo(progress);
                lastSyncTime.current = now;
              }
            }
          }
        } catch (error) {
          // 동기화 실패 시 무시
        }
      }
    }
  }, [currentTime, readyStates, isPlaying]);

  // Stage 상태가 APPROVED인지 확인하는 함수
  const isStageApproved = () => {
    if (!stageInfo) return false;
    const status = stageInfo.status?.toUpperCase();
    return status === 'APPROVED' || status === 'APPROVE';
  };

  const handleApprove = async () => {
    if (!stageId || !upstreamId) {
      showWarning('Stage 또는 Upstream이 선택되지 않았습니다.');
      return;
    }

    // Stage가 이미 승인된 경우 버튼 동작 방지
    if (isStageApproved()) {
      showWarning('이미 승인된 Stage입니다.');
      return;
    }

    try {
      await approveDropReviewer(stageId, upstreamId);
      showSuccess('승인 완료!');
    } catch (error) {
      showError('승인 중 오류 발생');
    }
  };

  const handleReject = async () => {
    if (!stageId || !upstreamId) {
      showWarning('Stage 또는 Upstream이 선택되지 않았습니다.');
      return;
    }

    // Stage가 이미 승인된 경우 버튼 동작 방지
    if (isStageApproved()) {
      showWarning('이미 승인된 Stage입니다.');
      return;
    }

    try {
      await rejectDropReviewer(stageId, upstreamId);
      showSuccess('거절 완료!');
    } catch (error) {
      showError('거절 중 오류 발생');
    }
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // WaveSurfer 인스턴스 정리
      Object.values(wavesurferRefs.current).forEach((ws) => {
        if (ws && typeof ws.destroy === 'function') {
          try {
            ws.destroy();
          } catch (error) {
            // Error destroying WaveSurfer
          }
        }
      });

      // refs 초기화
      wavesurferRefs.current = {};

      // seeking 플래그 초기화
      isSeeking.current = false;
    };
  }, []);

  // 렌더링 로그 최적화 (무한 리렌더링 방지)
  if (debugRef.current.lastState !== `${activePanel}-${stemsLoading}-${upstreamStems.length}`) {
    debugRef.current.lastState = `${activePanel}-${stemsLoading}-${upstreamStems.length}`;
  }

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
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
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
                <button
                  onClick={() => navigate(`/stage/${stageId}`)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg transition-all duration-200"
                >
                  <ChevronLeft size={20} />
                </button>
                <Logo />
              </div>

              {/* Center Section - Action Buttons */}
              {/* <div className="flex items-center space-x-3">
                <button
                  onClick={handleApprove}
                  disabled={isStageApproved()}
                  className={`px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-green-500/25 ${isStageApproved() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isStageApproved() ? 'APPROVED' : 'APPROVE'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={isStageApproved()}
                  className={`px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25 ${isStageApproved() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  REJECT
                </button>
              </div> */}

              {/* Right Section */}
              <div className="flex items-center gap-3">
                <button className="p-2 bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg transition-all duration-200">
                  <Bell size={20} />
                </button>
                <button className="p-2 bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg transition-all duration-200">
                  <Settings size={20} />
                </button>
                <button className="p-2 bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg transition-all duration-200">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Sub Header - Control Buttons */}
          <div className="px-4 sm:px-6 lg:px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10">
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setActivePanel(activePanel === 'stems' ? 'none' : 'stems')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activePanel === 'stems'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  } ${upstreamStems.length === 0 ? 'opacity-50' : ''}`}
              >
                Show Stems {upstreamStems.length > 0 && `(${upstreamStems.length})`}
              </button>

              <button
                onClick={() => setActivePanel(activePanel === 'comments' ? 'none' : 'comments')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activePanel === 'comments'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
              >
                Comments {comments.length > 0 && `(${comments.length})`}
              </button>
            </div>
          </div>

          {/* 새로운 슬라이드 패널 - 스템 목록 */}
          {activePanel === 'stems' && (
            <div
              className='fixed right-0 top-0 z-40 h-full bg-gray-900/95 backdrop-blur-sm border-l border-gray-700 shadow-2xl transition-all duration-300 ease-in-out'
              style={{
                width: '400px',
                minWidth: '300px',
                maxWidth: '500px'
              }}
            >
              {/* Resize Handle */}
              <div
                className='absolute left-0 top-0 w-1 h-full bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors'
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startWidth = 400;

                  const handleMouseMove = (e: MouseEvent) => {
                    const newWidth = startWidth - (e.clientX - startX);
                    if (newWidth >= 300 && newWidth <= 500) {
                      // Fixed width for now, remove resize functionality
                    }
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />

              <div className='h-full flex flex-col'>
                {/* Sidebar Header */}
                <div className='px-6 py-4 border-b border-gray-600 bg-gray-800/50'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h2 className='text-xl font-bold text-white mb-1 flex items-center gap-2'>
                        <Volume2 size={20} className='text-blue-400' />
                        스템 파일 목록
                      </h2>
                      <p className='text-sm text-gray-400'>
                        사용 가능한 오디오 파일들
                      </p>
                    </div>
                    <button
                      onClick={() => setActivePanel('none')}
                      className='rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-all duration-200'
                      title='닫기'
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Stem Files Content */}
                <div className='flex-1 flex flex-col px-6 py-4'>
                  {/* Status Section */}
                  <div className='mb-4 p-3 bg-gray-800/30 rounded-lg border-l-4 border-blue-400'>
                    <div className='flex items-center gap-2 mb-1'>
                      <div className='w-2 h-2 bg-blue-400 rounded-full'></div>
                      <span className='text-sm font-medium text-white'>로딩 상태</span>
                    </div>
                    <p className='text-xs text-gray-400'>
                      {stemsLoading ? '스템 파일을 불러오는 중...' : `${upstreamStems.length}개의 스템 발견`}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className='border-b border-gray-600 mb-4'></div>

                  {/* Content Area */}
                  <div className='flex-1 overflow-hidden'>
                    <h3 className='mb-3 text-sm font-medium text-gray-300 uppercase tracking-wide'>
                      스템 파일 목록
                    </h3>

                    {stemsLoading ? (
                      <div className='flex flex-col items-center justify-center py-12'>
                        <div className='h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent mb-3'></div>
                        <span className='text-white font-medium text-sm'>스템 로딩 중...</span>
                        <span className='text-xs text-gray-400 mt-1'>잠시만 기다려주세요</span>
                      </div>
                    ) : (
                      <div className='space-y-2 overflow-y-auto pr-2' style={{ maxHeight: 'calc(100vh - 320px)' }}>
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
                              <span className='text-gray-400'>{getDisplayFilename(item.stem.file_name)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}  */}

                        {(() => {
                          try {
                            // Reduce excessive logging (only log once per state change)
                            const currentState = `${activePanel}-${stemsLoading}-${upstreamStems.length}`;
                            const now = Date.now();

                            if (currentState !== debugRef.current.lastState || now - debugRef.current.lastLog > 2000) {
                              debugRef.current.lastLog = now;
                              debugRef.current.lastState = currentState;
                            }

                            if (stemsLoading) {
                              return (
                                <div className='py-8 text-center text-gray-400'>
                                  <div className='mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-white'></div>
                                  <span>Loading stems...</span>
                                </div>
                              );
                            }

                            if (upstreamStems.length === 0) {
                              return (
                                <div className='py-8 text-center text-gray-400'>
                                  <div className='space-y-2 text-center'>
                                    <div>No stems found for this upstream</div>
                                    <div className='text-xs'>
                                      Debug: stageId={stageId}, selectedUpstream=
                                      {selectedUpstream?.id}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // 개별 스템들만 렌더링 (폴더 형태가 아닌 평면적으로)
                            const allStems: any[] = [];

                            upstreamStems.forEach((stemItem, upstreamIndex) => {
                              // 개별 스템들만 추가 (타입별 정렬: new -> modify -> unchanged)
                              if (
                                stemItem?.stemData &&
                                Array.isArray(stemItem.stemData)
                              ) {
                                const sortedStems = [...stemItem.stemData].sort(
                                  (a, b) => {
                                    const typeOrder = {
                                      new: 0,
                                      modify: 1,
                                      unchanged: 2,
                                    };
                                    return (
                                      (typeOrder[a.type as keyof typeof typeOrder] ||
                                        3) -
                                      (typeOrder[b.type as keyof typeof typeOrder] || 3)
                                    );
                                  }
                                );

                                sortedStems.forEach((stem: any, stemIndex: number) => {
                                  allStems.push({
                                    data: stem,
                                    upstream: stemItem,
                                    key: `stem-${upstreamIndex}-${stemIndex}`,
                                    sortOrder:
                                      stem.type === 'new'
                                        ? 0
                                        : stem.type === 'modify'
                                          ? 1
                                          : 2,
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
                                      hoverColor: 'hover:bg-green-900/50',
                                    };
                                  case 'modify':
                                    return {
                                      icon: '🔄',
                                      bgColor: 'bg-yellow-900/30',
                                      borderColor: 'border-l-4 border-yellow-500',
                                      badgeColor: 'bg-yellow-600 text-white',
                                      hoverColor: 'hover:bg-yellow-900/50',
                                    };
                                  case 'unchanged':
                                    return {
                                      icon: '📄',
                                      bgColor: 'bg-gray-800/30',
                                      borderColor: 'border-l-4 border-gray-500',
                                      badgeColor: 'bg-gray-600 text-white',
                                      hoverColor: 'hover:bg-gray-800/50',
                                    };
                                  default:
                                    return {
                                      icon: '❓',
                                      bgColor: 'bg-gray-800/30',
                                      borderColor: 'border-l-4 border-gray-500',
                                      badgeColor: 'bg-gray-600 text-white',
                                      hoverColor: 'hover:bg-gray-800/50',
                                    };
                                }
                              };

                              const typeStyle = getTypeStyle(stemData.type);

                              return (
                                <div key={item.key} className='space-y-2'>
                                  <div
                                    onClick={() =>
                                      handleIndividualStemClick(stemData, upstream)
                                    }
                                    className={`cursor-pointer rounded p-3 text-sm text-white transition-all duration-200 ${typeStyle.bgColor} ${typeStyle.borderColor} ${typeStyle.hoverColor}`}
                                  >
                                    <div className='flex items-center justify-between'>
                                      <div className='flex items-center gap-2 font-medium'>
                                        <span className='text-lg'>
                                          {typeStyle.icon}
                                        </span>
                                        <span>
                                          {stemData.category?.name ||
                                            'Unknown Category'}
                                        </span>
                                      </div>
                                      <span
                                        className={`rounded px-2 py-1 text-xs font-medium ${typeStyle.badgeColor}`}
                                      >
                                        {stemData.type?.toUpperCase() || 'UNKNOWN'}
                                      </span>
                                    </div>
                                    <div className='mt-2 text-xs text-gray-300'>
                                      📁 {getDisplayFilename(stemData.stem?.file_name || 'Unknown file')}
                                    </div>
                                    <div className='mt-1 text-xs text-gray-400'>
                                      🎼 Instrument:{' '}
                                      {stemData.category?.instrument || 'Unknown'} | 👤
                                      By:{' '}
                                      {stemData.stem?.user?.username ||
                                        upstream?.user?.username ||
                                        'Unknown'}
                                    </div>
                                  </div>
                                </div>
                              );
                            });

                          } catch (error: any) {
                            return (
                              <div className='py-8 text-center text-red-400'>
                                <div>렌더링 중 오류가 발생했습니다.</div>
                                <div className='text-xs mt-2'>{error?.message || 'Unknown error'}</div>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
        )}

              {/* 새로운 슬라이드 패널 - 댓글 */}
              {activePanel === 'comments' && (
                <div className='fixed right-0 top-0 z-40 h-full w-80 bg-gray-900/95 backdrop-blur-sm border-l border-gray-700 shadow-2xl transition-all duration-300 ease-in-out'>
                  <div className='h-full flex flex-col'>
                    {/* Sidebar Header */}
                    <div className='px-6 py-4 border-b border-gray-600 bg-gray-800/50'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <h2 className='text-xl font-bold text-white mb-1 flex items-center gap-2'>
                            <MessageCircle size={20} className='text-blue-400' />
                            댓글
                          </h2>
                          <p className='text-sm text-gray-400'>
                            타임스탬프 기반 댓글들
                          </p>
                        </div>
                        <button
                          onClick={() => setActivePanel('none')}
                          className='rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-all duration-200'
                          title='닫기'
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Selected Upstream Info */}
                    {selectedUpstream && (
                      <div className='mb-6 rounded-lg bg-gray-800/50 border border-gray-700 p-4'>
                        <div className='text-sm font-semibold text-white mb-2'>
                          {selectedUpstream.title}
                        </div>
                        <div className='text-xs text-gray-300 mb-2'>
                          {selectedUpstream.description}
                        </div>
                        <div className='flex items-center gap-2 text-xs'>
                          <span className='text-blue-400'>작성자:</span>
                          <span className='text-white font-medium'>{selectedUpstream.user?.username}</span>
                        </div>
                      </div>
                    )}

                    {!selectedUpstream && (
                      <div className='mb-6 rounded-lg bg-gray-800/30 border border-gray-700 p-4 text-center'>
                        <div className='text-sm text-gray-300'>
                          오디오 파일을 선택하여 댓글을 확인하세요
                        </div>
                      </div>
                    )}

                    {/* Comments List */}
                    <div className='flex-1 overflow-hidden'>
                      {commentsLoading ? (
                        <div className='flex flex-col items-center justify-center py-12'>
                          <div className='h-8 w-8 animate-spin rounded-full border-3 border-blue-400 border-t-transparent mb-3'></div>
                          <span className='text-white font-medium'>댓글 로딩 중...</span>
                        </div>
                      ) : (
                        <div className='space-y-3 overflow-y-auto pr-2' style={{ maxHeight: 'calc(100vh - 280px)' }}>
                          {comments.map((comment) => (
                            <div
                              key={comment.id}
                              className='rounded-lg bg-gray-800/50 border border-gray-700 p-3 hover:bg-gray-800/70 transition-all duration-200'
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
                                <div className='mt-3'>
                                  <input
                                    type='text'
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                    className='w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none'
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
                                <div className='mt-2 text-gray-300'>
                                  {comment.comment}
                                  {comment.user && (
                                    <div className='mt-2 text-xs text-gray-400 flex items-center gap-1'>
                                      <span>작성자:</span>
                                      <span className='font-medium'>{comment.user.username}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Area - 반응형 레이아웃 */}
              <div className={`transition-all duration-300 ease-in-out px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 ${(activePanel as string) !== 'none' ? 'mr-80' : ''
                }`}>
                {/* Review Action Bar */}
                <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                        <span className="text-white font-medium">리뷰 대기 중</span>
                      </div>
                      {selectedUpstream && (
                        <div className="text-sm text-gray-300">
                          <span className="text-blue-400">검토 대상:</span> {selectedUpstream.title}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleApprove}
                        className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-green-500/25 flex items-center space-x-2"
                      >
                        <span>✓</span>
                        <span>승인</span>
                      </button>
                      <button
                        onClick={handleReject}
                        className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25 flex items-center space-x-2"
                      >
                        <span>✗</span>
                        <span>거절</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Waveform Section */}
                <div className="space-y-6">
                  {/* Guide Waveform */}
                  <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl transform transition-all duration-300">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">가이드 트랙</h3>
                      <div className="h-1 bg-gradient-to-r from-red-500 to-red-300 rounded-full"></div>
                    </div>

                    <div
                      ref={waveformContainerRef}
                      onMouseMove={handleWaveformMouseMove}
                      onMouseLeave={handleWaveformMouseLeave}
                      className="relative cursor-pointer"
                    >
                      {(() => {
                        if (guideLoading) {
                          return (
                            <div className="flex items-center justify-center py-12">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                                <span className="text-white">Loading guide...</span>
                              </div>
                            </div>
                          );
                        } else if (guideLoadAttempted && guideAudioUrl) {

                          const mainWaveProps = {
                            onReady: handleReady,
                            audioUrl: guideAudioUrl,
                            peaks: guidePeaks,
                            waveColor: theme.colors.waveform.main,
                            id: 'main',
                            isPlaying: isPlaying,
                            currentTime: currentTime,
                            onSolo: handleMainSolo,
                            isSolo: soloTrack === 'main',
                            onSeek: handleSeek,
                          };

                          return (
                            <div className='transform rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg transition-all duration-300'>
                              <Wave {...mainWaveProps} />

                              {/* 댓글 마커들 */}
                              {selectedUpstream && comments.map((comment) => {
                                const position = duration > 0 ? (comment.timeNumber / duration) * 100 : 0;
                                return (
                                  <div
                                    key={comment.id}
                                    className='absolute top-1/2 transform -translate-y-1/2 cursor-pointer z-20'
                                    style={{ left: `${position}%` }}
                                    onClick={() => seekToTime(comment.timeNumber)}
                                    title={`${comment.user?.username}: ${comment.comment}`}
                                  >
                                    <div className='w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg transition-transform'>
                                      <div className='w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600'></div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* 기존 댓글 마커들 */}
                              {comments.map((comment) => {
                                const position = duration > 0 ? (comment.timeNumber / duration) * 100 : 0;
                                return (
                                  <div
                                    key={`marker-${comment.id}`}
                                    className='absolute z-20 cursor-pointer'
                                    style={{
                                      left: `${position}%`,
                                      top: '10px',
                                      transform: 'translateX(-50%)',
                                    }}
                                    onClick={() => {
                                      if (wavesurferRefs.current['main']) {
                                        wavesurferRefs.current['main'].seekTo(comment.timeNumber / duration);
                                      }
                                    }}
                                    title={`${comment.user?.username}: ${comment.comment}`}
                                  >
                                    <div className='w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg transition-transform'>
                                      <div className='w-full h-full bg-blue-400 rounded-full animate-pulse'></div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* 호버 시 나타나는 댓글 추가 아이콘 */}
                              {hoveredPosition && !isInlineCommentOpen && (
                                <div
                                  className='absolute z-40 pointer-events-auto'
                                  style={{
                                    left: `${(hoveredPosition.x / (waveformContainerRef.current?.offsetWidth || 1)) * 100}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                >
                                  <button
                                    onClick={handleCommentIconClick}
                                    className='w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 border-2 border-white'
                                    title={`댓글 추가 (${Math.floor(hoveredPosition.time / 60)}:${String(Math.floor(hoveredPosition.time % 60)).padStart(2, '0')})`}
                                  >
                                    💬 {`(${Math.floor(hoveredPosition.time / 60)}:${String(Math.floor(hoveredPosition.time % 60)).padStart(2, '0')})`}
                                  </button>
                                </div>
                              )}

                              {/* SoundCloud 스타일 플로팅 댓글 버블들 */}
                              {floatingComments.map((comment) => {
                                const position = comment.position * 100;
                                return (
                                  <div
                                    key={comment.id}
                                    className='absolute z-30'
                                    style={{
                                      left: `${position}%`,
                                      top: '20px',
                                      transform: 'translateX(-50%)',
                                      animationDelay: `${comment.delay || 0}ms`,
                                    }}
                                  >
                                    {/* 개선된 댓글 버블 */}
                                    <div className='relative'>
                                      {/* 메인 버블 */}
                                      <div className='bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-3 rounded-2xl shadow-2xl max-w-xs relative comment-bubble border border-blue-400/30'>
                                        {/* 글리터 효과 */}
                                        <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-2xl'></div>

                                        <div className='relative z-10'>
                                          <div className='flex items-center gap-2 mb-2'>
                                            <div className='w-7 h-7 bg-blue-400 rounded-full flex items-center justify-center text-xs font-bold shadow-lg'>
                                              {comment.user?.username?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className='flex-1'>
                                              <div className='text-xs font-semibold opacity-95'>
                                                {comment.user?.username || 'Anonymous'}
                                              </div>
                                              <div className='text-xs opacity-80 font-mono'>
                                                {Math.floor(comment.timeNumber / 60)}:{String(Math.floor(comment.timeNumber % 60)).padStart(2, '0')}
                                              </div>
                                            </div>
                                          </div>
                                          <div className='text-sm font-medium leading-relaxed'>{comment.comment}</div>
                                        </div>

                                        {/* 아래쪽 화살표 - 더 부드러운 디자인 */}
                                        <div className='absolute top-full left-8 w-3 h-3 bg-blue-600 transform rotate-45 border-r border-b border-blue-400/30'></div>
                                      </div>

                                      {/* 연결선 - 더 세련된 스타일 */}
                                      <div className='absolute top-full left-8 w-px h-6 bg-gradient-to-b from-blue-500 to-transparent'></div>
                                    </div>
                                  </div>
                                );
                              })}

                            </div>
                          );
                        } else {
                          return (
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
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Comparison Waveform */}
                  {(() => {
                    return showExtraWaveform && extraAudio;
                  })() && (
                      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl transform transition-all duration-300">
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
              </div>

              {/* Control Bar - 반응형 */}
              <div className={`transition-all duration-300 ease-in-out bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10 shadow-xl ${(activePanel as string) !== 'none' ? 'mr-80' : ''
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Playback Controls */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={memoizedStopPlayback}
                        className="p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-200"
                      >
                        <Square size={20} />
                      </button>
                      <button
                        onClick={memoizedTogglePlay}
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
                        onChange={memoizedVolumeChange}
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
              {/* Keyboard Shortcuts Info */}
              <div className='bg-gray-800/50 border-t border-gray-700 px-6 py-2'>
                <div className='flex items-center justify-center text-xs text-gray-400'>
                  <span className='mr-4'>␣ Space: 재생/일시정지</span>
                  <span className='mr-4'>←/→: 5초 이동</span>
                  <span>↑/↓: 볼륨 조절</span>
                </div>
              </div>


              {/* 새로운 댓글 시스템 안내 - 반응형 */}
              <div className={`transition-all duration-300 ease-in-out px-4 sm:px-6 lg:px-8 py-4 ${(activePanel as string) !== 'none' ? 'mr-80' : ''
                }`}>
                <div className='text-center'>
                  <div className='inline-flex items-center gap-3 bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-lg px-6 py-3'>
                    <MessageCircle size={20} className='text-blue-400' />
                    <div className='text-sm'>
                      <div className='text-white font-medium'>인터랙티브 댓글 시스템</div>
                      <div className='text-gray-400'>파형에 마우스를 올리면 💬 아이콘이 나타납니다. 재생 시 프로그레스바가 댓글을 지나가면 자동으로 표시됩니다.</div>
                    </div>
                  </div>
                </div>
              </div>




              {/* 댓글 작성 모달 */}
              {/* 인라인 댓글 창 */}
              {isInlineCommentOpen && selectedUpstream && (
                <div
                  className='absolute z-50 animate-slide-in-right'
                  style={{
                    left: `${commentPosition.x}px`,
                    top: '280px',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className='bg-gray-900/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-2xl p-4 min-w-80 max-w-sm'>
                    {/* 상단 화살표 */}
                    <div className='absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-900 border-t border-l border-gray-600 rotate-45'></div>

                    {/* 헤더 */}
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-2'>
                        <div className='w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs'>
                          💬
                        </div>
                        <div>
                          <span className='text-white text-sm font-medium'>댓글 추가</span>
                          <div className='text-xs text-gray-400'>
                            {Math.floor(commentPosition.time / 60)}:{String(Math.floor(commentPosition.time % 60)).padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleCloseInlineComment}
                        className='text-gray-400 hover:text-white transition-colors p-1'
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* 댓글 입력 */}
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder='댓글을 입력하세요...'
                      className='w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 resize-none focus:border-blue-500 focus:outline-none text-sm'
                      rows={3}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleAddComment();
                        }
                        if (e.key === 'Escape') {
                          handleCloseInlineComment();
                        }
                      }}
                    />

                    {/* 버튼 */}
                    <div className='flex justify-end gap-2 mt-3'>
                      <button
                        onClick={handleCloseInlineComment}
                        className='px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors'
                      >
                        취소
                      </button>
                      <button
                        onClick={handleAddComment}
                        disabled={!newCommentText.trim()}
                        className='px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors'
                      >
                        작성 (Ctrl+Enter)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
      </div>
      </div>
      );
};

      export default StemSetReview;
