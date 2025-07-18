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
  const [soloTrack, setSoloTrack] = useState<'main' | 'extra' | 'selected-stem'>('main'); // 초기에는 guide(main)만 소리 나게
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
  
  // 선택된 스템 관리 상태 추가
  const [selectedStem, setSelectedStem] = useState<any>(null);
  const [selectedStemAudioUrl, setSelectedStemAudioUrl] = useState<string>('');
  const [selectedStemPeaks, setSelectedStemPeaks] = useState<any>(null);
  const [selectedStemLoading, setSelectedStemLoading] = useState(false);
  
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
      if (!stageId || !upstreamId) {
        console.warn('🔍 [fetchGuideUrl] Missing required parameters:', { stageId, upstreamId });
        return;
      }

      // 타임아웃 설정 (15초)
      const timeoutId = setTimeout(() => {
        console.error('⏰ [fetchGuideUrl] Request timeout after 15 seconds');
        setGuideLoading(false);
        showError('로딩 시간이 초과되었습니다. 새로고침 후 다시 시도해주세요.');
      }, 15000);

      try {
        setGuideLoading(true);
        setGuideLoadAttempted(true);
        console.log('🔍 [fetchGuideUrl] Starting fetch with stageId:', stageId, 'upstreamId:', upstreamId);

        // 캐시 키 생성
        const cacheKey = `guide-${upstreamId}`;
        
        // 임시: 항상 새로운 데이터를 가져오도록 캐시 클리어 (presigned URL 만료 문제 해결)
        console.log('🔄 [fetchGuideUrl] Clearing cache and fetching fresh presigned URLs');
        sessionStorage.removeItem(`audio-${cacheKey}`);
        sessionStorage.removeItem(`peaks-${cacheKey}`);

        // 1. 현재 스테이지 정보 가져오기
        console.log('🔍 [fetchGuideUrl] Fetching stage details...');
        const currentStageResponse = await getStageDetail(stageId);
        
        // 응답 구조 검증 강화
        if (!currentStageResponse) {
          throw new Error('Stage API returned null response');
        }
        
        if (!currentStageResponse.success) {
          throw new Error(`Stage API failed: ${currentStageResponse.message || 'Unknown error'}`);
        }
        
        if (!currentStageResponse.data) {
          throw new Error('Stage API returned no data');
        }

        console.log('✅ [fetchGuideUrl] Stage details fetched successfully');

        // 2. guide audio URL 및 waveform 데이터 가져오기 (병렬 처리)
        console.log('🔍 [fetchGuideUrl] Fetching guide audio and waveform data...');
        
        const [audioResponse, waveformUrlResponse] = await Promise.all([
          streamingService.getUpstreamGuideStreamingUrl(upstreamId),
          streamingService.getGuideWaveformPresignedUrl(upstreamId),
        ]);

        console.log('📦 [fetchGuideUrl] Audio response:', audioResponse?.success ? '✅ Success' : '❌ Failed');
        console.log('📦 [fetchGuideUrl] Waveform URL response:', waveformUrlResponse?.success ? '✅ Success' : '❌ Failed');

        // 오디오 URL 처리 - 응답 구조 검증 강화
        if (audioResponse?.success && audioResponse.data?.presignedUrl) {
          const audioUrl = audioResponse.data.presignedUrl;
          if (typeof audioUrl === 'string' && audioUrl.length > 0) {
            setGuideAudioUrl(audioUrl);
            sessionStorage.setItem(`audio-${cacheKey}`, audioUrl);
            console.log('🎵 [fetchGuideUrl] Guide audio URL set successfully');
          } else {
            throw new Error('Invalid audio URL format received');
          }
        } else {
          console.warn('⚠️ [fetchGuideUrl] Guide audio not available, using fallback');
          setGuideAudioUrl('/audio/track_ex.wav');
          showWarning('가이드 오디오를 불러올 수 없어 기본 오디오를 사용합니다.');
        }

        // 파형 데이터 처리 - presigned URL로 실제 JSON 데이터 다운로드
        if (waveformUrlResponse?.success && waveformUrlResponse.data?.presignedUrl) {
          console.log('🔍 [fetchGuideUrl] Downloading waveform data from presigned URL...');
          const waveformDataResponse = await streamingService.downloadWaveformData(waveformUrlResponse.data.presignedUrl);
          
          if (waveformDataResponse?.success && waveformDataResponse.data) {
            const waveformData = waveformDataResponse.data;
            
            // 파형 데이터 유효성 검사 - peaks 배열이나 {peaks: array} 구조 확인
            if (Array.isArray(waveformData) || 
                (waveformData.peaks && Array.isArray(waveformData.peaks))) {
              setGuidePeaks(waveformData);
              sessionStorage.setItem(`peaks-${cacheKey}`, JSON.stringify(waveformData));
              console.log('🌊 [fetchGuideUrl] Guide waveform data downloaded and set successfully');
            } else {
              console.warn('⚠️ [fetchGuideUrl] Invalid waveform data structure:', waveformData);
              setGuidePeaks(null);
            }
          } else {
            console.warn('⚠️ [fetchGuideUrl] Failed to download waveform data');
            setGuidePeaks(null);
          }
        } else {
          console.warn('⚠️ [fetchGuideUrl] Guide waveform presigned URL not available');
          setGuidePeaks(null);
        }

        console.log('✅ [fetchGuideUrl] Guide URL fetch completed successfully');

      } catch (error) {
        console.error('❌ [fetchGuideUrl] Error:', error);
        
        // 에러 타입별 처리
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (errorMessage.includes('timeout') || errorMessage.includes('Network')) {
          showError('네트워크 연결을 확인하고 다시 시도해주세요.');
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
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
        console.log('🏁 [fetchGuideUrl] Fetch process completed, loading state cleared');
      }
    };

    fetchGuideUrl();
  }, [stageId, upstreamId, showError, showWarning]);

  // 강제로 guideLoading 상태 해제 - API 호출이 성공했는데도 로딩이 계속되는 문제 해결
  useEffect(() => {
    if (guideAudioUrl && guidePeaks && guideLoading) {
      console.log('🔧 [Force Guide Loading Clear] Audio and peaks available but still loading, forcing clear');
      setGuideLoading(false);
    }
  }, [guideAudioUrl, guidePeaks, guideLoading]);

  // 타이머 기반 강제 로딩 해제 - 5초 후에도 로딩 중이면 강제 해제
  useEffect(() => {
    if (guideLoading) {
      const forceStopTimer = setTimeout(() => {
        if (guideLoading) {
          console.log('🔧 [Force Guide Loading Clear Timer] Loading too long, forcing clear after 5 seconds');
          setGuideLoading(false);
        }
      }, 5000);
      
      return () => clearTimeout(forceStopTimer);
    }
  }, [guideLoading]);

  // 스템 데이터 로드 함수 분리
  const loadStemsData = async (stageId: string, upstream: any) => {
    console.log('🎯 [loadStemsData] Starting stems load:', {
      stageId,
      upstreamId: upstream?.id,
      upstreamTitle: upstream?.title
    });

    // 타임아웃 설정 (15초)
    const timeoutId = setTimeout(() => {
      console.error('⏰ [loadStemsData] Request timeout after 15 seconds');
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
      console.log('🔍 [loadStemsData] Fetching stage details...');
      const stageResponse = await getStageDetail(stageId);
      
      // 응답 구조 검증
      if (!stageResponse) {
        throw new Error('Stage API returned null response');
      }
      
      if (!stageResponse.success) {
        throw new Error(`Stage API failed: ${stageResponse.message || 'Unknown error'}`);
      }
      
      if (!stageResponse.data?.track?.id) {
        throw new Error('Stage response missing track ID');
      }
    
      const currentTrackId = stageResponse.data.track.id;
      console.log('✅ [loadStemsData] Track ID obtained:', currentTrackId);
      
      // 2. 스템 정보 가져오기
      console.log('🔍 [loadStemsData] Fetching upstream stems...');
      const stemResponse = await getUpstreamStems(currentTrackId, upstream.id);
      
      // 스템 응답 구조 검증
      if (!stemResponse) {
        throw new Error('Stems API returned null response');
      }
      
      if (!stemResponse.success) {
        console.warn('⚠️ [loadStemsData] Stems API failed, but continuing with empty data');
        // 스템이 없는 경우는 에러가 아님
      }

      const stemData = stemResponse?.data?.data || null;
      
      if (stemData && Array.isArray(stemData) && stemData.length > 0) {
        console.log('✅ [loadStemsData] Stems found:', {
          count: stemData.length,
          types: stemData.map(s => s.type),
          categories: stemData.map(s => s.category?.name)
        });
      } else {
        console.log('⚠️ [loadStemsData] No stems found for this upstream');
      }
      
      // 3. 결과 구성
      const stemsResult = [
        {
          ...upstream,
          upstreamId: upstream.id,
          stemData: stemData,
        },
      ];
      
      setUpstreamStems(stemsResult);
      console.log('✅ [loadStemsData] Stems data loaded successfully');

    } catch (error) {
      console.error('❌ [loadStemsData] Error:', error);
      
      // 에러 타입별 처리
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('Network')) {
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
      console.log('🏁 [loadStemsData] Loading completed');
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

  // 볼륨 적용 헬퍼 함수 - 안전한 볼륨 조절
  const applyVolumeSettings = useCallback(async (targetSoloTrack: 'main' | 'extra' | 'selected-stem') => {
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];
    const selectedStemPlayer = wavesurferRefs.current['selected-stem'];

    console.log('🔊 Applying volume settings for solo track:', targetSoloTrack);
    console.log('🔊 Ready states:', readyStates);
    console.log('🔊 Available players:', {
      main: !!mainPlayer,
      extra: !!extraPlayer,
      selectedStem: !!selectedStemPlayer
    });

    try {
      // 각 플레이어에 대해 순차적으로 볼륨 설정
      const setPlayerVolume = async (player: any, targetVolume: number, playerName: string) => {
        if (!player) return;
        
        try {
          // 약간의 딜레이를 두어 동시 호출 방지
          await new Promise(resolve => setTimeout(resolve, 10));
          player.setVolume(targetVolume);
          console.log(`🔊 ${playerName} volume set to:`, targetVolume);
        } catch (error: any) {
          // AbortError는 무시, 다른 에러만 로그
          if (error.name !== 'AbortError') {
            console.warn(`🔊 Warning setting ${playerName} volume:`, error.message);
          }
        }
      };

      if (targetSoloTrack === 'main') {
        // 메인 트랙만 재생
        console.log('🔊 Main track solo mode');
        await Promise.all([
          readyStates['main'] ? setPlayerVolume(mainPlayer, volume, 'main') : Promise.resolve(),
          readyStates['extra'] ? setPlayerVolume(extraPlayer, 0, 'extra') : Promise.resolve(),
          readyStates['selected-stem'] ? setPlayerVolume(selectedStemPlayer, 0, 'selected-stem') : Promise.resolve()
        ]);
      } else if (targetSoloTrack === 'extra') {
        // 엑스트라 트랙만 재생
        console.log('🔊 Extra track solo mode');
        await Promise.all([
          readyStates['main'] ? setPlayerVolume(mainPlayer, 0, 'main') : Promise.resolve(),
          readyStates['extra'] ? setPlayerVolume(extraPlayer, volume, 'extra') : Promise.resolve(),
          readyStates['selected-stem'] ? setPlayerVolume(selectedStemPlayer, 0, 'selected-stem') : Promise.resolve()
        ]);
      } else if (targetSoloTrack === 'selected-stem') {
        // 선택된 스템만 재생
        console.log('🔊 Selected stem solo mode');
        await Promise.all([
          readyStates['main'] ? setPlayerVolume(mainPlayer, 0, 'main') : Promise.resolve(),
          readyStates['extra'] ? setPlayerVolume(extraPlayer, 0, 'extra') : Promise.resolve(),
          readyStates['selected-stem'] ? setPlayerVolume(selectedStemPlayer, volume, 'selected-stem') : Promise.resolve()
        ]);
      }

      console.log('✅ Volume settings applied successfully');
    } catch (error) {
      console.error('❌ Error applying volume settings:', error);
    }
  }, [volume, readyStates]);

  const handleSolo = useCallback((trackId: 'main' | 'extra' | 'selected-stem') => {
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];
    const selectedStemPlayer = wavesurferRefs.current['selected-stem'];

    console.log(`🔊 Solo request for: ${trackId}`);
    console.log(`🔊 Ready states:`, readyStates);
    console.log(`🔊 Available players:`, { 
      main: !!mainPlayer, 
      extra: !!extraPlayer,
      'selected-stem': !!selectedStemPlayer
    });

    // 엄격한 준비 상태 체크
    if (!mainPlayer || !readyStates['main']) {
      showWarning('메인 플레이어가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      console.warn('🔊 Main player not ready for solo operation');
      return;
    }

    if (trackId === 'extra' && (!extraPlayer || !readyStates['extra'])) {
      showWarning('선택한 스템이 준비되지 않았습니다. 스템을 먼저 로드해주세요.');
      console.warn('🔊 Extra player not ready for solo operation');
      return;
    }

    if (trackId === 'selected-stem' && (!selectedStemPlayer || !readyStates['selected-stem'])) {
      showWarning('선택한 스템이 준비되지 않았습니다. 스템을 먼저 로드해주세요.');
      console.warn('🔊 Selected stem player not ready for solo operation');
      return;
    }

    try {
      // 현재 선택된 트랙과 같은 트랙을 다시 클릭해도 그대로 유지 (토글 없음)
      // 다른 트랙을 클릭하면 해당 트랙으로 전환
      const newSoloTrack = trackId;
      
      console.log(`🔊 Solo mode changing from '${soloTrack}' to '${newSoloTrack}'`);
      
      // 상태 업데이트만 하고 useEffect에서 볼륨 적용을 처리
      setSoloTrack(newSoloTrack);
      
      console.log(`✅ Solo mode changed to: ${newSoloTrack}`);
      
    } catch (error) {
      console.error('❌ Error in solo operation:', error);
      showError('Solo 기능 실행 중 오류가 발생했습니다.');
      
      // 오류 발생 시 안전한 상태로 복구 (기본값: main)
      try {
        setSoloTrack('main');
      } catch (recoveryError) {
        console.error('❌ Error during solo recovery:', recoveryError);
      }
    }
  }, [soloTrack, readyStates, applyVolumeSettings, showWarning, showError]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      
      // 볼륨 값 유효성 검사
      if (isNaN(vol) || vol < 0 || vol > 1) {
        console.warn('🔊 Invalid volume value:', vol);
        return;
      }
      
      setVolume(vol);
      console.log(`🔊 Volume slider changed to: ${vol}`);
      // volume 상태 변경은 useEffect(volume 의존성)에서 자동으로 볼륨 적용 처리
    },
    []
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

  // 댓글 클릭 시 해당 시간으로 이동 (모든 스템 동기화)
  const seekToTime = useCallback((time: number) => {
    const mainPlayer = wavesurferRefs.current['main'];
    const extraPlayer = wavesurferRefs.current['extra'];
    const selectedStemPlayer = wavesurferRefs.current['selected-stem'];

    if (mainPlayer && mainPlayer.getDuration()) {
      const progress = time / mainPlayer.getDuration();
      
      // 모든 플레이어를 동기화
      mainPlayer.seekTo(progress);
      
      if (extraPlayer && extraPlayer.getDuration()) {
        extraPlayer.seekTo(progress);
      }
      
      if (selectedStemPlayer && selectedStemPlayer.getDuration()) {
        selectedStemPlayer.seekTo(progress);
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

      // 양방향 동기화: 움직인 트랙이 아닌 다른 모든 트랙을 동기화
      const mainPlayer = wavesurferRefs.current['main'];
      const extraPlayer = wavesurferRefs.current['extra'];
      const selectedStemPlayer = wavesurferRefs.current['selected-stem'];

      if (mainPlayer && readyStates['main']) {
        try {
          const progress = time / mainPlayer.getDuration();
          if (progress >= 0 && progress <= 1) {
            // main 트랙에서 seek가 발생하면 다른 모든 트랙을 동기화
            if (trackId === 'main') {
              if (extraPlayer && readyStates['extra']) {
                extraPlayer.seekTo(progress);
              }
              if (selectedStemPlayer && readyStates['selected-stem']) {
                selectedStemPlayer.seekTo(progress);
              }
            }
            // extra 트랙에서 seek가 발생하면 다른 모든 트랙을 동기화
            else if (trackId === 'extra') {
              if (mainPlayer && readyStates['main']) {
                mainPlayer.seekTo(progress);
              }
              if (selectedStemPlayer && readyStates['selected-stem']) {
                selectedStemPlayer.seekTo(progress);
              }
            }
            // selected-stem 트랙에서 seek가 발생하면 다른 모든 트랙을 동기화
            else if (trackId === 'selected-stem') {
              if (mainPlayer && readyStates['main']) {
                mainPlayer.seekTo(progress);
              }
              if (extraPlayer && readyStates['extra']) {
                extraPlayer.seekTo(progress);
              }
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
      console.log('🎵 [handleIndividualStemClick] Stem clicked:', {
        stemId: stemData.stem?.id,
        type: stemData.type,
        category: stemData.category?.name
      });

      // 타임아웃 설정 (20초)
      const timeoutId = setTimeout(() => {
        console.error('⏰ [handleIndividualStemClick] Request timeout after 20 seconds');
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
        
        // 선택된 스템 정보 저장
        setSelectedStem(stemData);
        setSelectedStemLoading(true);

        // 캐시 키 생성
        const stemId = stemData.stem.id;
        const stemType = stemData.type;
        const cacheKey = `${stemType}-${stemId}`;
        
        console.log('🔍 [handleIndividualStemClick] Cache key:', cacheKey);
        
        // 캐시된 데이터 확인
        const cachedUrl = sessionStorage.getItem(`audio-${cacheKey}`);
        const cachedPeaks = sessionStorage.getItem(`peaks-${cacheKey}`);
        
        if (cachedUrl) {
          console.log('📦 [handleIndividualStemClick] Using cached audio URL');
          setSelectedStemAudioUrl(cachedUrl);
          setExtraAudio(cachedUrl);
          setStemLoading(false);
          
          if (cachedPeaks) {
            try {
              const parsedPeaks = JSON.parse(cachedPeaks);
              setSelectedStemPeaks(parsedPeaks);
              setExtraPeaks(parsedPeaks);
              setWaveformLoading(false);
              setSelectedStemLoading(false);
              clearTimeout(timeoutId);
              console.log('✅ [handleIndividualStemClick] Loaded from cache successfully');
              return;
            } catch (parseError) {
              console.warn('⚠️ [handleIndividualStemClick] Cache parse error:', parseError);
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
              () => streamingService.getVersionStemWaveformData(stemId)
            ];
          } else {
            return [
              () => streamingService.getStemStreamingUrl(stemId),
              () => streamingService.getStemWaveformData(stemId)
            ];
          }
        };

        const [getStreamingUrl, getWaveformData] = getApiCalls();

        console.log('🔍 [handleIndividualStemClick] Fetching stem data...');
        
        // 순차적으로 API 호출 (병렬 처리 시 경쟁 상태 방지)
        let audioResponse: any;
        let waveformResponse: any;

        try {
          audioResponse = await getStreamingUrl();
          console.log('📦 [handleIndividualStemClick] Audio response:', audioResponse?.success ? '✅' : '❌');
        } catch (audioError) {
          console.error('❌ [handleIndividualStemClick] Audio fetch error:', audioError);
          audioResponse = { success: false, error: audioError };
        }

        try {
          waveformResponse = await getWaveformData();
          console.log('📦 [handleIndividualStemClick] Waveform response:', waveformResponse?.success ? '✅' : '❌');
        } catch (waveformError) {
          console.error('❌ [handleIndividualStemClick] Waveform fetch error:', waveformError);
          waveformResponse = { success: false, error: waveformError };
        }

        // 오디오 URL 처리 - 응답 구조 검증 강화
        if (audioResponse?.success && audioResponse.data?.presignedUrl) {
          const audioUrl = audioResponse.data.presignedUrl;
          
          if (typeof audioUrl === 'string' && audioUrl.length > 0) {
            setSelectedStemAudioUrl(audioUrl);
            setExtraAudio(audioUrl);
            sessionStorage.setItem(`audio-${cacheKey}`, audioUrl);
            console.log('🎵 [handleIndividualStemClick] Audio URL set successfully');
          } else {
            throw new Error('Invalid audio URL format');
          }
        } else {
          console.warn('⚠️ [handleIndividualStemClick] Audio not available');
          setSelectedStemAudioUrl('');
          setExtraAudio('');
          showWarning('이 스템의 오디오 파일을 불러올 수 없습니다.');
        }

        // 파형 데이터 처리 - 응답 구조 검증 강화
        if (waveformResponse?.success && waveformResponse.data) {
          const waveformData = waveformResponse.data;
          
          // 파형 데이터 유효성 검사 - peaks 배열이나 {peaks: array} 구조 확인
          if (Array.isArray(waveformData) || 
              (waveformData.peaks && Array.isArray(waveformData.peaks)) ||
              (waveformData.data && Array.isArray(waveformData.data))) {
            setSelectedStemPeaks(waveformData);
            setExtraPeaks(waveformData);
            sessionStorage.setItem(`peaks-${cacheKey}`, JSON.stringify(waveformData));
            console.log('🌊 [handleIndividualStemClick] Waveform data set successfully');
          } else {
            console.warn('⚠️ [handleIndividualStemClick] Invalid waveform structure:', waveformData);
            setSelectedStemPeaks(null);
            setExtraPeaks(null);
          }
        } else {
          console.warn('⚠️ [handleIndividualStemClick] Waveform data not available');
          setSelectedStemPeaks(null);
          setExtraPeaks(null);
        }

        console.log('✅ [handleIndividualStemClick] Stem loading completed');

      } catch (error) {
        console.error('❌ [handleIndividualStemClick] Error:', error);
        
        // 에러 타입별 처리
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('timeout') || errorMessage.includes('Network')) {
          showError('네트워크 연결을 확인하고 다시 시도해주세요.');
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
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
        setSelectedStemLoading(false);
        console.log('🏁 [handleIndividualStemClick] Loading states cleared');
      }
    },
    [showWarning, showError]
  );

  // Solo 버튼 핸들러들을 메모이제이션
  const handleMainSolo = useCallback(() => handleSolo('main'), [handleSolo]);
  const handleExtraSolo = useCallback(() => handleSolo('extra'), [handleSolo]);
  const handleSelectedStemSolo = useCallback(() => handleSolo('selected-stem'), [handleSolo]);

  // soloTrack 또는 volume 상태 변경 시 볼륨 적용을 위한 useEffect
  useEffect(() => {
    if (Object.keys(readyStates).length > 0) {
      console.log('🔊 SoloTrack or volume changed, applying volume settings:', { soloTrack, volume });
      applyVolumeSettings(soloTrack).catch(error => {
        console.error('❌ Error applying volume settings on state change:', error);
      });
    }
  }, [soloTrack, volume, readyStates, applyVolumeSettings]);

  // audioprocess 이벤트를 통한 재생 중 동기화 (main을 기준으로 모든 스템 동기화)
  useEffect(() => {
    const extraPlayer = wavesurferRefs.current['extra'];
    const mainPlayer = wavesurferRefs.current['main'];
    const selectedStemPlayer = wavesurferRefs.current['selected-stem'];

    // 재생 중일 때만 audioprocess 이벤트를 통한 동기화 수행
    if (
      isPlaying &&
      mainPlayer &&
      readyStates['main'] &&
      !isSeeking.current // 시크 중이 아닐 때만 동기화
    ) {
      try {
        // 현재 시간이 유효한 경우에만 동기화 시도
        if (currentTime > 0 && mainPlayer.getDuration() > 0) {
          const progress = currentTime / mainPlayer.getDuration();
          if (progress >= 0 && progress <= 1) {
            
            // Extra 플레이어 동기화
            if (extraPlayer && readyStates['extra']) {
              const extraTime = extraPlayer.getCurrentTime();
              if (Math.abs(extraTime - currentTime) > 0.1) {
                console.log('🔄 Syncing extra player to main time:', currentTime);
                extraPlayer.seekTo(progress);
              }
            }
            
            // Selected stem 플레이어 동기화
            if (selectedStemPlayer && readyStates['selected-stem']) {
              const selectedStemTime = selectedStemPlayer.getCurrentTime();
              if (Math.abs(selectedStemTime - currentTime) > 0.1) {
                console.log('🔄 Syncing selected stem player to main time:', currentTime);
                selectedStemPlayer.seekTo(progress);
              }
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

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      console.log('🧹 [Cleanup] Component unmounting, cleaning up resources...');
      
      // WaveSurfer 인스턴스 정리
      Object.values(wavesurferRefs.current).forEach((ws) => {
        if (ws && typeof ws.destroy === 'function') {
          try {
            ws.destroy();
            console.log('🧹 [Cleanup] WaveSurfer instance destroyed');
          } catch (error) {
            console.warn('⚠️ [Cleanup] Error destroying WaveSurfer:', error);
          }
        }
      });
      
      // refs 초기화
      wavesurferRefs.current = {};
      
      // seeking 플래그 초기화
      isSeeking.current = false;
      
      console.log('✅ [Cleanup] Component cleanup completed');
    };
  }, []);

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
          {(() => {
            if (guideLoading) {
              return (
                <div className='flex flex-col items-center justify-center py-8 bg-gray-900/30 rounded-md p-6'>
                  <div className='mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-red-400'></div>
                  <span className='text-white font-medium'>파형을 준비하는 중...</span>
                  <span className='text-gray-400 text-sm mt-2'>잠시만 기다려주세요</span>
                </div>
              );
            } else if (guideLoadAttempted && guideAudioUrl) {
              const mainWaveProps = {
                onReady: handleReady,
                audioUrl: guideAudioUrl,
                peaks: guidePeaks,
                waveColor: '#f87171',
                id: 'main',
                isPlaying: isPlaying,
                currentTime: currentTime,
                onSolo: handleMainSolo,
                isSolo: soloTrack === 'main',
                onSeek: handleSeek
              };
              
              return (
                <>
                  <Wave {...mainWaveProps} />
                </>
              );
            } else {
              return (
                <div className='flex items-center justify-center py-8 bg-gray-900/30 rounded-md p-6'>
                  <span className='text-sm text-white'>
                    이 스테이지에 사용 가능한 가이드 오디오가 없습니다.
                  </span>
                </div>
              );
            }
          })()}

          {/* 선택된 스템 표시 영역 */}
          {selectedStem && (
            <div className="mt-6">
              {/* 선택된 스템 정보 헤더 */}
              <div className="bg-gray-800/50 rounded-t-md p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-blue-400 text-lg">
                      {selectedStem.type === 'new' && '✨'}
                      {selectedStem.type === 'modify' && '🔧'}
                      {selectedStem.type === 'unchanged' && '📋'}
                    </div>
                    <div>
                      <h3 className="text-white font-medium">
                        {selectedStem.category?.name || 'Selected Stem'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {selectedStem.stem?.file_name || 'Unknown file'} • 
                        <span className={`ml-1 px-2 py-0.5 rounded text-xs font-medium ${
                          selectedStem.type === 'new' ? 'bg-green-500/20 text-green-300' :
                          selectedStem.type === 'modify' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {selectedStem.type?.toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  {/* 스템 제거 버튼 */}
                  <button
                    onClick={() => {
                      setSelectedStem(null);
                      setSelectedStemAudioUrl('');
                      setSelectedStemPeaks(null);
                      setShowExtraWaveform(false);
                      setExtraAudio('');
                      setExtraPeaks(null);
                    }}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700/50"
                    title="스템 제거"
                  >
                    <Square size={16} />
                  </button>
                </div>
              </div>
              
              {/* 스템 파형 영역 */}
              <div className="bg-gray-900/30 rounded-b-md">
                {selectedStemLoading || stemLoading || waveformLoading ? (
                  <div className='p-6'>
                    <div className='flex flex-col items-center justify-center py-8'>
                      <div className='mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-400'></div>
                      <span className='text-white font-medium'>선택한 스템을 불러오는 중...</span>
                      <span className='text-gray-400 text-sm mt-2'>
                        {stemLoading && '스템 오디오를 가져오는 중...'}
                        {waveformLoading && '파형 데이터를 가져오는 중...'}
                      </span>
                    </div>
                  </div>
                ) : selectedStemAudioUrl ? (
                  <Wave
                    onReady={handleReady}
                    audioUrl={selectedStemAudioUrl}
                    peaks={selectedStemPeaks}
                    waveColor='#60a5fa'
                    id='selected-stem'
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    onSolo={handleSelectedStemSolo}
                    isSolo={soloTrack === 'selected-stem'}
                    onSeek={handleSeek}
                  />
                ) : (
                  <div className='flex items-center justify-center py-8 p-6'>
                    <span className='text-sm text-gray-400'>
                      선택된 스템의 오디오를 불러올 수 없습니다.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 기존 extra waveform (하위 호환성 유지) */}
          {showExtraWaveform && extraAudio && !selectedStem && (
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