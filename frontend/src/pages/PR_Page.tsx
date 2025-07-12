import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Headphones,
  Square,
  ChevronsRight,
  UserPlus,
  Check,
  X,
} from 'lucide-react';
import Multitrack from 'wavesurfer-multitrack';
import Logo from '../components/Logo.tsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import MasterStemService from '../services/masterStemService.ts';
import DropService from '../services/dropService.ts';
import DropSelectionService from '../services/dropSelectionService.ts';
import DropReviewerService from '../services/dropReviewerService.ts';
import TrackService from '../services/trackService.ts';
import StreamingService from '../services/streamingService.ts';




interface Track {
  id: string;
  name: string;
  type: string;
  color: string;
  audioUrl: string;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
}

interface ReviewerUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

const colorMap: Record<string, string> = {
  'bg-gray-darkest': '#0D0D0D',
  'bg-gray-dark': '#262626',
  'bg-gray-medium': '#595959',
  'bg-gray-light': '#BFBFBF',
  'bg-gray-lightest': '#D9D9D9',
};

const StepSidebar: React.FC = () => {
  const steps = [
    {
      number: 1,
      title: 'Create Drop with Reviewers',
      description: 'Compare stems, write message, and assign reviewers',
    },
  ];

  return (
    <div className='w-80 border-r border-[#595959] bg-[#262626] px-6 py-6'>
      <h2 className='mb-6 text-xl font-bold text-[#D9D9D9]'>Drop Process</h2>

      <div className='space-y-4'>
        {steps.map((step) => (
          <div key={step.number} className='flex items-start space-x-4'>
            <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold bg-[#D9D9D9] text-[#0D0D0D]'>
              {step.number}
            </div>
            <div className='flex-1'>
              <h3 className='text-sm font-medium text-[#D9D9D9]'>
                {step.title}
              </h3>
              <p className='mt-1 text-xs text-[#BFBFBF]'>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PR_Page: React.FC = () => {
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [reviewerUsers, setReviewerUsers] = useState<ReviewerUser[]>([]);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(0);
  const [soloTrackId, setSoloTrackId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const multitrackRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const navigate = useNavigate();
  const { showWarning, showSuccess } = useToast();
  const [prMessage, setPrMessage] = useState('');

  const [tracks, setTracks] = useState<Track[]>([]);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const trackId = queryParams.get('trackId');
  const sessionId = queryParams.get('sessionId');

  const pickColorByIndex = (index: number) => {
    const colors = [
      'bg-[#D9D9D9]',
      'bg-[#BFBFBF]',
      'bg-[#595959]',
      'bg-[#262626]',
      'bg-[#D9D9D9]',
      'bg-[#BFBFBF]',
      'bg-[#595959]',
      'bg-[#262626]',
    ];
    return colors[index % colors.length];
  };

  const compareRes = useRef<any>(null);
  useEffect(() => {
    const fetchStemComparison = async () => {
      console.log("🔍 fetchStemComparison 시작");
      console.log("sessionId:", sessionId);
      console.log("trackId:", trackId);
      
      if (!sessionId || !trackId) {
        console.warn("❌ sessionId 또는 trackId가 없습니다");
        return;
      }
  
      try {
        setIsLoading(true);
        console.log("📡 MasterStemService.compareBestStemWithMasterStem 호출 시작");
        
        const res = await MasterStemService.compareBestStemWithMasterStem(
          sessionId,
          trackId
        );
        
        console.log("📡 MasterStemService.compareBestStemWithMasterStem 응답:", res);
        console.log("📡 응답 데이터 타입:", typeof res);
        console.log("📡 응답 데이터 keys:", res ? Object.keys(res) : 'null');
        
        if (!res || !res.data || !Array.isArray(res.data)) {
          console.error("❌ 잘못된 응답 형식:", res);
          throw new Error("Invalid response format: 'data' is not an array");
        }

        console.log("✅ 응답 데이터 유효성 검증 완료");
        console.log("📊 응답 데이터 길이:", res.data.length);
        
        compareRes.current = res;
        
        // 1. stemId 수집
        console.log("🔍 1단계: stemId 수집 시작");
        const stemIds: string[] = [];
        
        res.data.forEach((item: any, index: number) => {
          console.log(`📊 아이템 ${index}:`, item);
          const { data } = item;
          const { masterStem, sessionBestStem: stem } = data;
          
          console.log(`📊 아이템 ${index} - masterStem:`, masterStem);
          console.log(`📊 아이템 ${index} - sessionBestStem:`, stem);
          
          if (masterStem && masterStem.id) {
            console.log(`✅ masterStem ID 추가: ${masterStem.id}`);
            stemIds.push(masterStem.id);
          } else {
            console.log(`❌ masterStem ID 없음 (아이템 ${index})`);
          }
          
          if (stem && stem.stem_file && stem.stem_file.id) {
            console.log(`✅ sessionBestStem ID 추가: ${stem.stem_file.id}`);
            stemIds.push(stem.stem_file.id);
          } else {
            console.log(`❌ sessionBestStem ID 없음 (아이템 ${index})`);
          }
        });
        
        console.log("🔍 1단계 완료 - 수집된 stemIds:", stemIds);
        console.log("🔍 1단계 완료 - stemIds 개수:", stemIds.length);
        
        // 2. StreamingService.getBatchStreamingUrls 호출
        console.log("🔍 2단계: StreamingService.getBatchStreamingUrls 호출 시작");
        let presignedMap = new Map<string, string>();
        
        if (stemIds.length > 0) {
          console.log("📡 StreamingService.getBatchStreamingUrls 호출");
          const streamRes = await StreamingService.getBatchStreamingUrls(stemIds);
          console.log("📡 StreamingService 응답:", streamRes);
          console.log("📡 StreamingService 응답 타입:", typeof streamRes);
          console.log("📡 StreamingService 응답 success:", streamRes?.success);
          console.log("📡 StreamingService 응답 data:", streamRes?.data);
          
          if (streamRes.success && streamRes.data && streamRes.data.streams) {
            console.log("✅ 스트리밍 URL 획득 성공");
            console.log("📊 스트리밍 데이터 개수:", streamRes.data.streams.length);
            
            // 3. 응답 매핑 후 audioUrl을 presignedUrl로 대체
            console.log("🔍 3단계: presignedUrl 매핑 시작");
            presignedMap = new Map(
              streamRes.data.streams.map((s) => [s.stemId, s.presignedUrl])
            );
            console.log("🔍 3단계 완료 - presignedMap:", presignedMap);
            console.log("🔍 3단계 완료 - presignedMap 크기:", presignedMap.size);
            
            // 각 매핑 확인
            presignedMap.forEach((url, stemId) => {
              console.log(`🔗 매핑: ${stemId} -> ${url ? url.substring(0, 50) + '...' : 'null'}`);
            });
          } else {
            console.error("❌ 스트리밍 URL 획득 실패:", streamRes.message);
            console.error("❌ StreamingService 전체 응답:", streamRes);
          }
        } else {
          console.warn("⚠️ stemIds가 비어있어 스트리밍 URL 요청 건너뜀");
        }
        
        // 4. newTracks 구성 시 file_path 대신 presignedUrl 사용
        console.log("🔍 4단계: newTracks 구성 시작");
        const newTracks: Track[] = [];
        
        res.data.forEach((item: any, index: number) => {
          console.log(`🔍 트랙 구성 중 (아이템 ${index})`);
          const { categoryId, data } = item;
          const { masterStem, sessionBestStem: stem } = data;
         
          console.log(`📊 아이템 ${index} - categoryId:`, categoryId);
          const color = pickColorByIndex(index);
          console.log(`🎨 아이템 ${index} - 선택된 색상:`, color);
  
          if (masterStem) {
            const url = presignedMap.get(masterStem.id) || 'Not Stem';
            console.log(`🔗 masterStem URL 매핑: ${masterStem.id} -> ${url}`);
            
            const masterTrack = {
              id: `m-${index}`,
              name: `Master ${masterStem.file_name}`,
              type: categoryId,
              color,
              audioUrl: url,
              isPlaying: false,
              isMuted: false,
              volume: 0.8,
            };
            console.log(`✅ masterTrack 생성:`, masterTrack);
            newTracks.push(masterTrack);
          } else {
            console.log(`❌ masterStem 없음 (아이템 ${index})`);
            const noMasterTrack = {
              id: `m-${index}`,
              name: `Master (No Stem Available)`,
              type: categoryId,
              color,
              audioUrl: 'Not Stem',
              isPlaying: false,
              isMuted: true,
              volume: 0,
            };
            console.log(`⚠️ noMasterTrack 생성:`, noMasterTrack);
            newTracks.push(noMasterTrack);
          }
        
          if (stem) {
            const url = presignedMap.get(stem.stem_file.id) || 'Not Stem';
            console.log(`🔗 sessionBestStem URL 매핑: ${stem.stem_file.id} -> ${url}`);
            
            const pullTrack = {
              id: `s-${index}`,
              name: `Pull ${stem.stem_file.file_name}`,
              type: categoryId,
              color,
              audioUrl: url,
              isPlaying: false,
              isMuted: false,
              volume: 0.8,
            };
            console.log(`✅ pullTrack 생성:`, pullTrack);
            newTracks.push(pullTrack);
          } else {
            console.log(`❌ sessionBestStem 없음 (아이템 ${index})`);
            const noPullTrack = {
              id: `s-${index}`,
              name: `Pull (Same as Master)`,
              type: categoryId,
              color,
              audioUrl: 'Not Stem',
              isPlaying: false,
              isMuted: true,
              volume: 0,
            };
            console.log(`⚠️ noPullTrack 생성:`, noPullTrack);
            newTracks.push(noPullTrack);
          }
        });
        
        console.log("🔍 4단계 완료 - newTracks 전체:", newTracks);
        console.log("📊 newTracks 개수:", newTracks.length);
        console.log("📊 유효한 트랙 개수:", newTracks.filter(t => t.audioUrl && t.audioUrl !== 'Not Stem').length);
        console.log("📊 'Not Stem' 트랙 개수:", newTracks.filter(t => t.audioUrl === 'Not Stem').length);
        
        // 트랙 타입별 분석
        const tracksByType = newTracks.reduce((acc, track) => {
          acc[track.type] = acc[track.type] || [];
          acc[track.type].push(track);
          return acc;
        }, {} as Record<string, Track[]>);
        
        console.log("📊 트랙 타입별 분석:", tracksByType);
        
        console.log("✅ 트랙 설정 및 로딩 완료");
        setTracks(newTracks);
        setIsLoading(false);
      } catch (e) {
        console.error('❌ Stem 비교 데이터 가져오기 실패:', e);
        console.error('❌ 에러 스택:', e instanceof Error ? e.stack : '스택 정보 없음');
        setIsLoading(false);
      }
    };
  
    fetchStemComparison();
  }, [sessionId, trackId]);

  // 리뷰어 데이터 가져오기
  useEffect(() => {
    fetchReviewers();
  }, [trackId]);

  // 멀티트랙 컴포넌트 초기화 - tracks가 업데이트될 때마다 실행
  useEffect(() => {
    console.log("🎵 멀티트랙 초기화 useEffect 실행");
    console.log("🎵 containerRef.current:", !!containerRef.current);
    console.log("🎵 tracks.length:", tracks.length);
    console.log("🎵 isLoading:", isLoading);
    
    if (!containerRef.current || tracks.length === 0 || isLoading) {
      console.log("🎵 멀티트랙 초기화 조건 미충족 - 건너뜀");
      return;
    }

    console.log("🎵 멀티트랙 초기화 시작");
    
    // 기존 멀티트랙 인스턴스 제거
    if (multitrackRef.current) {
      console.log("🎵 기존 멀티트랙 인스턴스 제거");
      multitrackRef.current.destroy();
    }

    // 유효한 오디오 URL을 가진 트랙만 멀티트랙에 포함
    const validTracks = tracks.filter(track => track.audioUrl && track.audioUrl !== 'Not Stem');
    console.log("🎵 전체 트랙 수:", tracks.length);
    console.log("🎵 유효한 트랙 수:", validTracks.length);
    console.log("🎵 유효한 트랙 목록:", validTracks.map(t => ({ id: t.id, name: t.name, audioUrl: t.audioUrl.substring(0, 50) + '...' })));
    
    if (validTracks.length === 0) {
      console.warn('⚠️ 유효한 트랙이 없어 멀티트랙을 생성하지 않음');
      return;
    }

    // 트랙 데이터를 멀티트랙 포맷으로 변환
    const multitrackTracks = validTracks.map((track, index) => {
      const multitrackTrack = {
        id: index,
        url: track.audioUrl,
        startPosition: 0,
        volume: track.volume,
        draggable: false,
        options: {
          waveColor: colorMap[track.color] || '#ffffff',
          progressColor: '#ffffff',
          height: 80,
          barHeight: 0.8,
          barWidth: 5,
        },
      };
      console.log(`🎵 멀티트랙 트랙 ${index} 생성:`, multitrackTrack);
      return multitrackTrack;
    });

    console.log('🎵 멀티트랙 생성 준비 완료');
    console.log('🎵 멀티트랙 트랙 개수:', multitrackTracks.length);
    console.log('🎵 컨테이너 요소:', containerRef.current);

    try {
      // 멀티트랙 인스턴스 생성
      console.log('🎵 Multitrack.create 호출');
      multitrackRef.current = Multitrack.create(multitrackTracks, {
        container: containerRef.current,
        minPxPerSec: 100,
        cursorColor: '#ffffff',
        cursorWidth: 2,
        trackBackground: '#374151',
        trackBorderColor: '#4B5563',
      });

      console.log('🎵 멀티트랙 인스턴스 생성 완료:', multitrackRef.current);

      // 이벤트 리스너 설정
      multitrackRef.current.once('canplay', () => {
        console.log('🎵 멀티트랙 재생 준비 완료 (canplay 이벤트)');
        setIsReady(true);
      });

      multitrackRef.current.on('ready', () => {
        console.log('🎵 멀티트랙 준비 완료 (ready 이벤트)');
      });

      multitrackRef.current.on('error', (error: any) => {
        console.error('🎵 멀티트랙 에러:', error);
      });

      // 트랙 변경 이벤트 리스너
      multitrackRef.current.on(
        'volume-change',
        ({ id, volume }: { id: number; volume: number }) => {
          console.log(`🎵 트랙 ${id} 볼륨 변경: ${volume}`);
          // 유효한 트랙에 대해서만 상태 업데이트
          if (id >= 0 && id < validTracks.length) {
            const originalTrackId = validTracks[id].id;
            console.log(`🎵 트랙 ${id} (원본 ID: ${originalTrackId}) 볼륨 상태 업데이트`);
            setTracks((prevTracks) =>
              prevTracks.map((track) =>
                track.id === originalTrackId ? { ...track, volume } : track
              )
            );
          }
        }
      );

      console.log('🎵 멀티트랙 이벤트 리스너 설정 완료');
    } catch (error) {
      console.error('🎵 멀티트랙 생성 중 오류:', error);
    }

    return () => {
      console.log('🎵 멀티트랙 useEffect 클린업 실행');
      if (multitrackRef.current) {
        console.log('🎵 멀티트랙 인스턴스 정리');
        multitrackRef.current.destroy();
      }
    };
  }, [tracks, isLoading]);

  // 현재 시간 업데이트
  useEffect(() => {
    console.log('🎵 시간 업데이트 useEffect 실행');
    const updateTime = () => {
      if (multitrackRef.current) {
        const currentTime = multitrackRef.current.getCurrentTime();
        const isPlaying = multitrackRef.current.isPlaying();
        setCurrentTime(currentTime);
        setIsPlaying(isPlaying);
      }
      animationRef.current = requestAnimationFrame(updateTime);
    };

    updateTime();

    return () => {
      console.log('🎵 시간 업데이트 애니메이션 클린업');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const togglePlay = () => {
    console.log('🎵 togglePlay 호출');
    console.log('🎵 multitrackRef.current:', !!multitrackRef.current);
    console.log('🎵 isReady:', isReady);
    
    if (!multitrackRef.current || !isReady) {
      console.warn('⚠️ 멀티트랙이 준비되지 않았거나 존재하지 않음');
      return;
    }

    const currentlyPlaying = multitrackRef.current.isPlaying();
    console.log('🎵 현재 재생 상태:', currentlyPlaying);

    if (currentlyPlaying) {
      console.log('🎵 재생 일시정지');
      multitrackRef.current.pause();
    } else {
      console.log('🎵 재생 시작');
      multitrackRef.current.play();
    }
  };

  const toggleTrackMute = (trackId: string) => {
    console.log('🎵 toggleTrackMute 호출:', trackId);
    
    const trackIndex = tracks.findIndex(track => track.id === trackId);
    console.log('🎵 트랙 인덱스:', trackIndex);
    
    if (trackIndex === -1 || !multitrackRef.current) {
      console.warn('⚠️ 트랙을 찾을 수 없거나 멀티트랙이 없음');
      return;
    }

    const track = tracks[trackIndex];
    const newMuted = !track.isMuted;
    console.log('🎵 트랙 뮤트 상태 변경:', track.isMuted, '->', newMuted);

    // 유효한 트랙들 중에서 실제 멀티트랙 인덱스 찾기
    const validTracks = tracks.filter(t => t.audioUrl && t.audioUrl !== 'Not Stem');
    const multitrackIndex = validTracks.findIndex(t => t.id === trackId);
    console.log('🎵 멀티트랙 인덱스:', multitrackIndex);

    if (multitrackIndex !== -1) {
      const newVolume = newMuted ? 0 : track.volume;
      console.log('🎵 멀티트랙 볼륨 설정:', multitrackIndex, '->', newVolume);
      multitrackRef.current.setTrackVolume(multitrackIndex, newVolume);
    }

    // 상태 업데이트
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.id === trackId ? { ...track, isMuted: newMuted } : track
      )
    );
  };

  const toggleTrackSolo = (trackId: string) => {
    console.log('🎵 toggleTrackSolo 호출:', trackId);
    
    const trackIndex = tracks.findIndex(track => track.id === trackId);
    console.log('🎵 트랙 인덱스:', trackIndex);
    
    if (trackIndex === -1 || !multitrackRef.current) {
      console.warn('⚠️ 트랙을 찾을 수 없거나 멀티트랙이 없음');
      return;
    }

    const validTracks = tracks.filter(t => t.audioUrl && t.audioUrl !== 'Not Stem');
    console.log('🎵 유효한 트랙들:', validTracks.map(t => t.id));

    if (soloTrackId === trackId) {
      console.log('🎵 솔로 해제 - 모든 트랙 원래 볼륨으로 복구');
      setSoloTrackId(null);
      
      tracks.forEach((track) => {
        const multitrackIndex = validTracks.findIndex(t => t.id === track.id);
        if (multitrackIndex !== -1) {
          const volume = track.isMuted ? 0 : track.volume;
          console.log(`🎵 트랙 ${track.id} 볼륨 복구:`, volume);
          multitrackRef.current.setTrackVolume(multitrackIndex, volume);
        }
      });
    } else {
      console.log('🎵 솔로 설정 - 선택된 트랙만 활성화');
      setSoloTrackId(trackId);
      
      tracks.forEach((track) => {
        const multitrackIndex = validTracks.findIndex(t => t.id === track.id);
        if (multitrackIndex !== -1) {
          if (track.id === trackId) {
            const volume = track.isMuted ? 0 : track.volume;
            console.log(`🎵 솔로 트랙 ${track.id} 볼륨 유지:`, volume);
            multitrackRef.current.setTrackVolume(multitrackIndex, volume);
          } else {
            console.log(`🎵 트랙 ${track.id} 뮤트`);
            multitrackRef.current.setTrackVolume(multitrackIndex, 0);
          }
        }
      });
    }
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    console.log('🎵 handleSeek 호출');
    console.log('🎵 이벤트:', event);
    console.log('🎵 multitrackRef.current:', !!multitrackRef.current);
    console.log('🎵 containerRef.current:', !!containerRef.current);
    console.log('🎵 isReady:', isReady);
    
    if (!multitrackRef.current || !containerRef.current || !isReady) {
      console.warn('⚠️ 시크 불가능 - 멀티트랙 또는 컨테이너가 준비되지 않음');
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    
    console.log('🎵 클릭 위치:', {
      clientX: event.clientX,
      rectLeft: rect.left,
      x: x,
      width: rect.width,
      percentage: percentage
    });

    const clampedPercentage = Math.max(0, Math.min(percentage, 1));
    console.log('🎵 조정된 퍼센트:', clampedPercentage);
    
    try {
      console.log('🎵 멀티트랙 시크 실행');
      multitrackRef.current.seekTo(clampedPercentage);
      console.log('🎵 멀티트랙 시크 완료');
    } catch (error) {
      console.error('🎵 멀티트랙 시크 중 오류:', error);
    }
  };

  const handleBranchClick = () => {
    navigate(`/branch?trackId=${trackId}&sessionId=${sessionId}`);
  };

  // 협업자 및 소유자 데이터 가져오기
  const fetchReviewers = async () => {
    if (!trackId) return;
    
    try {
      setIsLoadingReviewers(true);
      
      // 1. 트랙 정보 가져오기 (소유자 정보 포함)
      const trackRes = await TrackService.getTrackById(trackId);
      const track = trackRes.data;
      
      if (!track) {
        throw new Error('트랙 정보를 가져올 수 없습니다.');
      }
      
      // 2. 협업자 목록 가져오기
      const collaboratorsRes = await TrackService.getCollaborators(trackId);
      const collaborators = collaboratorsRes.data || [];
      
      // 3. 소유자와 협업자를 합쳐서 리뷰어 목록 생성
      const reviewers: ReviewerUser[] = [];
      
      // 소유자 추가
      if (track.owner_id) {
        reviewers.push({
          id: track.owner_id.id.toString(),
          username: track.owner_id.username,
          email: track.owner_id.email,
          role: 'Owner'
        });
      }
      
      // 협업자 추가
      collaborators.forEach(collaborator => {
        if (collaborator.user) {
          reviewers.push({
            id: collaborator.user.id.toString(),
            username: collaborator.user.username,
            email: collaborator.user.email,
            role: collaborator.role
          });
        }
      });
      
      setReviewerUsers(reviewers);
      console.log('Loaded reviewers:', reviewers);
    } catch (error) {
      console.error('리뷰어 데이터 가져오기 실패:', error);
      showWarning('리뷰어 목록을 가져오는데 실패했습니다.');
    } finally {
      setIsLoadingReviewers(false);
    }
  };

  const handleReviewerToggle = (userId: string) => {
    setSelectedReviewers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateDrop = async () => {
    if (!prMessage.trim()) {
      showWarning('Please enter a Drop message');
      return;
    }

    if (selectedReviewers.length === 0) {
      showWarning('Please select at least one reviewer');
      return;
    }
    if (!trackId) {
      showWarning('Track ID is required');
      return;
    }
  
    try {
      // 1. Drop 생성
      const dropRes = await DropService.createDrop({
        description: prMessage,
        trackId: trackId,
      });
      const dropId = dropRes.data.id;
  
      console.log("dropId", dropId);
      
      // 2. DropSelection 생성
      for (const item of compareRes.current.data) {
        if (item.data.sessionBestStem !== null) {
          await DropSelectionService.createDropSelection(
            {
              drop_id: dropId,
              stem_id: item.data.sessionBestStem.stem_file.id,
            }
          );
        }
      }

      // 3. 선택된 모든 리뷰어에게 리뷰 요청
      for (const userId of selectedReviewers) {
        try {
          await DropReviewerService.createDropReviewer({
            drop_id: dropId,
            user_id: userId,
          });
          console.log(`Reviewer ${userId} assigned to drop ${dropId}`);
        } catch (error) {
          console.error(`Failed to assign reviewer ${userId}:`, error);
          showWarning(`리뷰어 ${userId} 할당에 실패했습니다.`);
        }
      }
  
      showSuccess('Drop created successfully with reviewers assigned!');
      navigate(`/master?trackId=${trackId}`);
    } catch (error) {
      console.error('Drop 생성 중 오류:', error);
      showWarning('Drop 생성에 실패했습니다.');
    }
  };

  return (
    <div className='flex h-screen w-screen flex-col overflow-hidden bg-[#0D0D0D] text-[#D9D9D9]'>
      {/* 헤더 */}
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
            <button
              className='rounded-lg bg-[#D9D9D9] px-6 py-2.5 font-medium text-[#0D0D0D] shadow-md transition-colors hover:bg-[#BFBFBF]'
              onClick={handleBranchClick}
            >
              Session
            </button>
            <button className='rounded-lg bg-[#D9D9D9] px-6 py-2.5 font-medium text-[#0D0D0D] shadow-md transition-colors hover:bg-[#BFBFBF]'>
              Collaborate
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className='flex flex-1 overflow-hidden'>
        {/* 왼쪽 사이드바 */}
        <StepSidebar />

        <div className='flex flex-1'>
          {/* 메인 컨텐츠 영역 */}
          <div className='flex flex-1 flex-col'>
            {/* Drop 메시지 입력 및 리뷰어 선택 영역 */}
            <div className='border-t border-[#595959] bg-[#262626] px-6 py-6'>
              <div className='mx-auto max-w-6xl'>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                  {/* Drop 메시지 입력 */}
                  <div className='space-y-4'>
                    <div>
                      <label
                        htmlFor='pr-message'
                        className='mb-3 block text-lg font-bold text-[#D9D9D9]'
                      >
                        Drop Message
                      </label>
                      <textarea
                        id='pr-message'
                        value={prMessage}
                        onChange={(e) => setPrMessage(e.target.value)}
                        placeholder='Enter your Drop message...'
                        rows={6}
                        className='w-full resize-none rounded-lg border border-[#595959] bg-[#595959] px-4 py-3 text-[#D9D9D9] placeholder-[#BFBFBF] transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#D9D9D9]'
                      />
                    </div>
                  </div>

                  {/* 리뷰어 선택 */}
                  <div className='space-y-4'>
                    <div>
                      <label className='mb-3 block text-lg font-bold text-[#D9D9D9]'>
                        Select Reviewers
                      </label>
                      <div className='max-h-60 overflow-y-auto space-y-2'>
                        {isLoadingReviewers ? (
                          <div className="text-center py-4">
                            <div className="text-[#BFBFBF] text-sm">Loading reviewers...</div>
                          </div>
                        ) : reviewerUsers.length > 0 ? (
                          reviewerUsers.map((user) => (
                            <div
                              key={user.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                                selectedReviewers.includes(user.id)
                                  ? 'border-[#D9D9D9] bg-[#D9D9D9] bg-opacity-10'
                                  : 'border-[#595959] hover:border-[#BFBFBF]'
                              }`}
                              onClick={() => handleReviewerToggle(user.id)}
                            >
                              <div className='flex items-center space-x-3'>
                                <div className='w-8 h-8 rounded-full bg-[#595959] flex items-center justify-center'>
                                  <UserPlus className='h-4 w-4 text-[#BFBFBF]' />
                                </div>
                                <div>
                                  <div className='font-medium text-[#D9D9D9] text-sm'>{user.username}</div>
                                  <div className='text-xs text-[#BFBFBF]'>{user.email}</div>
                                  <div className='text-xs text-[#595959]'>{user.role}</div>
                                </div>
                              </div>
                              <div className='flex items-center'>
                                {selectedReviewers.includes(user.id) ? (
                                  <Check className='h-4 w-4 text-[#FA576A]' />
                                ) : (
                                  <div className='w-4 h-4 border-2 border-gray-500 rounded'></div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4">
                            <div className="text-gray-400 text-sm">No reviewers available</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 선택된 리뷰어 표시 */}
                    {selectedReviewers.length > 0 && (
                      <div className='mt-4'>
                        <label className='mb-2 block text-sm font-medium text-[#D9D9D9]'>
                          Selected Reviewers ({selectedReviewers.length})
                        </label>
                        <div className='flex flex-wrap gap-2'>
                          {selectedReviewers.map((userId) => {
                            const user = reviewerUsers.find(u => u.id === userId);
                            return (
                              <div
                                key={userId}
                                className='flex items-center space-x-2 bg-[#D9D9D9] bg-opacity-20 border border-[#D9D9D9] rounded-lg px-3 py-1'
                              >
                                <span className='text-[#D9D9D9] text-sm'>{user?.username}</span>
                                <button
                                  onClick={() => handleReviewerToggle(userId)}
                                  className='text-[#D9D9D9] hover:text-[#BFBFBF]'
                                >
                                  <X className='h-3 w-3' />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 제출 버튼 */}
                <div className='mt-6 flex justify-end'>
                  <button
                    onClick={handleCreateDrop}
                    disabled={!prMessage.trim() || selectedReviewers.length === 0}
                    className={`rounded-lg px-8 py-3 font-semibold text-[#0D0D0D] shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#D9D9D9] focus:ring-offset-2 focus:ring-offset-[#262626] ${
                      prMessage.trim() && selectedReviewers.length > 0
                        ? 'bg-[#D9D9D9] hover:bg-[#BFBFBF]'
                        : 'bg-[#595959] cursor-not-allowed'
                    }`}
                  >
                    Create Drop
                  </button>
                </div>
              </div>
            </div>

            {/* 트랙 컨트롤 버튼 영역 */}
            <div className='border-t border-[#595959] bg-[#262626] px-6 py-5'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  {/* 재생 버튼 */}
                  <button
                    onClick={togglePlay}
                    disabled={!isReady}
                    className={`rounded-full p-3 shadow-lg transition-all ${
                      isPlaying
                        ? 'bg-[#BFBFBF] text-[#0D0D0D] hover:bg-[#D9D9D9] hover:shadow-xl'
                        : 'bg-[#D9D9D9] text-[#0D0D0D] hover:bg-[#BFBFBF] hover:shadow-xl'
                    } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {isPlaying ? (
                      <Pause className='h-6 w-6' />
                    ) : (
                      <Play className='h-6 w-6' />
                    )}
                  </button>
                  {/* 리셋 버튼 */}
                  <button
                    onClick={() => {
                      if (multitrackRef.current && isReady) {
                        multitrackRef.current.setTime(0);
                      }
                    }}
                    disabled={!isReady}
                    className={`rounded-lg p-2.5 text-[#BFBFBF] transition-colors hover:bg-[#595959] hover:text-[#D9D9D9] ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <Square className='h-5 w-5' />
                  </button>
                  {/* 10초 전진 버튼 */}
                  <button
                    onClick={() => {
                      if (multitrackRef.current && isReady) {
                        multitrackRef.current.setTime(
                          multitrackRef.current.getCurrentTime() + 10
                        );
                      }
                    }}
                    disabled={!isReady}
                    className={`rounded-lg p-2 text-[#BFBFBF] hover:bg-[#595959] ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <ChevronsRight className='h-5 w-5' />
                  </button>
                </div>
                {/* 현재 시간 표시 영역 */}
                <div className='flex items-center space-x-4'>
                  <div className='rounded-lg bg-[#595959] px-4 py-2 font-mono text-sm text-[#BFBFBF] shadow-inner'>
                    {Math.floor(currentTime)}:
                    {String(Math.floor((currentTime % 1) * 60)).padStart(
                      2,
                      '0'
                    )}
                    {duration > 0 && (
                      <span className='text-[#595959]'>
                        {' '}
                        / {Math.floor(duration)}:00
                      </span>
                    )}
                  </div>
                  {!isReady && (
                    <div className='flex items-center space-x-2 text-sm text-[#BFBFBF]'>
                      <div className='h-2 w-2 animate-pulse rounded-full bg-[#BFBFBF]'></div>
                      <span>Loading tracks...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 트랙 비교 영역 */}
            <div className='flex-1 overflow-hidden bg-gray-900'>
              <div className='p-6'>
                <div className='relative'>
                  <div>
                    {(() => {
                      console.log("🎨 트랙 비교 영역 렌더링 시작");
                      console.log("🎨 tracks.length:", tracks.length);
                      console.log("🎨 tracks:", tracks);
                      console.log("🎨 isLoading:", isLoading);
                      console.log("🎨 isReady:", isReady);
                      
                      if (tracks.length === 0) {
                        console.log("🎨 트랙이 없어서 렌더링하지 않음");
                        return null;
                      }

                      // 트랙 타입별로 그룹핑
                      const trackTypes = Array.from(new Set(tracks.map(track => track.type)));
                      console.log("🎨 고유 트랙 타입들:", trackTypes);

                      trackTypes.forEach(instrumentType => {
                        const groupTracks = tracks.filter(track => track.type === instrumentType);
                        console.log(`🎨 ${instrumentType} 그룹 트랙들:`, groupTracks);
                        
                        const masterTrack = groupTracks.find(track => track.name.includes('Master'));
                        const pullTrack = groupTracks.find(track => track.name.includes('Pull'));
                        console.log(`🎨 ${instrumentType} - Master 트랙:`, masterTrack);
                        console.log(`🎨 ${instrumentType} - Pull 트랙:`, pullTrack);
                      });

                      return null;
                    })()}
                    
                    {/* 트랙 데이터가 있으면 무조건 표시 */}
                    {tracks.length > 0 ? (
                      Array.from(new Set(tracks.map(track => track.type))).map(
                        (instrumentType) => {
                          console.log(`🎨 렌더링 중: ${instrumentType}`);
                          
                          const groupTracks = tracks.filter(
                            (track) => track.type === instrumentType
                          );
                          console.log(`🎨 ${instrumentType} 그룹 트랙들:`, groupTracks);
                          
                          const masterTrack = groupTracks.find((track) =>
                            track.name.includes('Master')
                          );
                          const pullTrack = groupTracks.find((track) =>
                            track.name.includes('Pull')
                          );

                          console.log(`🎨 ${instrumentType} - Master 트랙:`, masterTrack);
                          console.log(`🎨 ${instrumentType} - Pull 트랙:`, pullTrack);

                          return (
                            <div key={instrumentType}>
                              {(() => {
                                console.log(`🎨 ${instrumentType} 컨테이너 렌더링`);
                                return null;
                              })()}
                              
                            {/* Master 트랙 */}
                            {masterTrack ? (
                              <div className={`overflow-hidden rounded-lg border shadow-lg transition-shadow hover:shadow-xl ${
                                masterTrack.audioUrl === 'Not Stem' 
                                  ? 'border-gray-500 bg-gray-800 opacity-60' 
                                  : 'border-gray-600 bg-gray-900'
                              }`}>
                                {(() => {
                                  console.log(`🎨 Master 트랙 렌더링: ${masterTrack.name}`);
                                  console.log(`🎨 Master 트랙 오디오 URL: ${masterTrack.audioUrl}`);
                                  console.log(`🎨 Master 트랙 색상: ${masterTrack.color}`);
                                  console.log(`🎨 Master 트랙 뮤트 상태: ${masterTrack.isMuted}`);
                                  return null;
                                })()}
                                
                                <div className='flex items-center'>
                                  {/* 트랙 컨트롤 */}
                                  <div className='w-80 border-r border-gray-600 p-4'>
                                    <div className='flex items-center space-x-3'>
                                      <button
                                        onClick={() => {
                                          console.log(`🎨 Master 트랙 재생 버튼 클릭: ${masterTrack.name}`);
                                          togglePlay();
                                        }}
                                        disabled={isLoading || !isReady}
                                        className={`rounded-full p-2 transition-colors ${
                                          isPlaying
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        } ${(isLoading || !isReady) ? 'cursor-not-allowed opacity-50' : ''}`}
                                      >
                                        {isPlaying ? (
                                          <Pause className='h-4 w-4' />
                                        ) : (
                                          <Play className='h-4 w-4' />
                                        )}
                                      </button>
                                      <button className='rounded-full bg-gray-600 p-2 text-gray-300 transition-colors hover:bg-gray-500'>
                                        <Download className='h-4 w-4' />
                                      </button>
                                      <div className='flex-1'>
                                        <div className={`text-sm font-medium ${
                                          masterTrack.audioUrl === 'Not Stem' ? 'text-gray-400' : 'text-white'
                                        }`}>
                                          {masterTrack.name}
                                        </div>
                                        <div className={`text-xs ${
                                          masterTrack.audioUrl === 'Not Stem' ? 'text-gray-500' : 'text-green-400'
                                        }`}>
                                          {masterTrack.audioUrl === 'Not Stem' ? 'No Audio Available' : 'Original (Master)'}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          console.log(`🎨 Master 트랙 솔로 버튼 클릭: ${masterTrack.name}`);
                                          toggleTrackSolo(masterTrack.id);
                                        }}
                                        disabled={!isReady}
                                        className={`rounded-full p-2 transition-colors ${
                                          soloTrackId === masterTrack.id
                                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                                      >
                                        <Headphones className='h-4 w-4' />
                                      </button>
                                      <button
                                        onClick={() => {
                                          console.log(`🎨 Master 트랙 뮤트 버튼 클릭: ${masterTrack.name}`);
                                          toggleTrackMute(masterTrack.id);
                                        }}
                                        disabled={!isReady}
                                        className={`rounded-full p-2 transition-colors ${
                                          masterTrack.isMuted
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                                      >
                                        {masterTrack.isMuted ? (
                                          <VolumeX className='h-4 w-4' />
                                        ) : (
                                          <Volume2 className='h-4 w-4' />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div
                                    className={`${masterTrack.color} relative flex flex-1 bg-gray-900 bg-opacity-20`}
                                    style={{ height: '80px' }}
                                    data-track-id={masterTrack.id}
                                  >
                                    {(() => {
                                      console.log(`🎨 Master 트랙 웨이브폼 영역: ${masterTrack.id}`);
                                      console.log(`🎨 Master 트랙 웨이브폼 색상: ${masterTrack.color}`);
                                      return null;
                                    })()}
                                    
                                    {isLoading && (
                                      <div className='absolute inset-0 flex items-center justify-center'>
                                        <div className='text-sm text-gray-400'>
                                          Loading...
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-gray-800 rounded mb-2">
                                {(() => {
                                  console.log(`🎨 ${instrumentType} Master 트랙 없음`);
                                  return null;
                                })()}
                                <div className="text-white text-sm">No Master track for {instrumentType}</div>
                              </div>
                            )}

                            {/* Pull 트랙 */}
                            {pullTrack ? (
                              <div className={`overflow-hidden rounded-lg border shadow-lg transition-shadow hover:shadow-xl ${
                                pullTrack.audioUrl === 'Not Stem' 
                                  ? 'border-gray-500 bg-gray-800 opacity-60' 
                                  : 'border-gray-400 bg-gray-700'
                              }`}>
                                {(() => {
                                  console.log(`🎨 Pull 트랙 렌더링: ${pullTrack.name}`);
                                  console.log(`🎨 Pull 트랙 오디오 URL: ${pullTrack.audioUrl}`);
                                  console.log(`🎨 Pull 트랙 색상: ${pullTrack.color}`);
                                  console.log(`🎨 Pull 트랙 뮤트 상태: ${pullTrack.isMuted}`);
                                  return null;
                                })()}
                                
                                <div className='flex items-center'>
                                  <div className='w-80 border-r border-gray-600 p-4'>
                                    <div className='flex items-center space-x-3'>
                                      <button
                                        onClick={() => {
                                          console.log(`🎨 Pull 트랙 재생 버튼 클릭: ${pullTrack.name}`);
                                          togglePlay();
                                        }}
                                        disabled={isLoading || !isReady}
                                        className={`rounded-full p-2 transition-colors ${
                                          isPlaying
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        } ${(isLoading || !isReady) ? 'cursor-not-allowed opacity-50' : ''}`}
                                      >
                                        {isPlaying ? (
                                          <Pause className='h-4 w-4' />
                                        ) : (
                                          <Play className='h-4 w-4' />
                                        )}
                                      </button>
                                      <button className='rounded-full bg-gray-600 p-2 text-gray-300 transition-colors hover:bg-gray-500'>
                                        <Download className='h-4 w-4' />
                                      </button>
                                      <div className='flex-1'>
                                        <div className={`text-sm font-medium ${
                                          pullTrack.audioUrl === 'Not Stem' ? 'text-gray-400' : 'text-white'
                                        }`}>
                                          {pullTrack.name}
                                        </div>
                                        <div className={`text-xs ${
                                          pullTrack.audioUrl === 'Not Stem' ? 'text-gray-500' : 'text-blue-400'
                                        }`}>
                                          {pullTrack.audioUrl === 'Not Stem' ? 'No Audio Available' : 'Modified (Pull Request)'}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          console.log(`🎨 Pull 트랙 솔로 버튼 클릭: ${pullTrack.name}`);
                                          toggleTrackSolo(pullTrack.id);
                                        }}
                                        disabled={!isReady}
                                        className={`rounded-full p-2 transition-colors ${
                                          soloTrackId === pullTrack.id
                                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                                      >
                                        <Headphones className='h-4 w-4' />
                                      </button>
                                      <button
                                        onClick={() => {
                                          console.log(`🎨 Pull 트랙 뮤트 버튼 클릭: ${pullTrack.name}`);
                                          toggleTrackMute(pullTrack.id);
                                        }}
                                        disabled={!isReady}
                                        className={`rounded-full p-2 transition-colors ${
                                          pullTrack.isMuted
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
                                      >
                                        {pullTrack.isMuted ? (
                                          <VolumeX className='h-4 w-4' />
                                        ) : (
                                          <Volume2 className='h-4 w-4' />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div
                                    className={`${pullTrack.color} relative flex flex-1 bg-gray-900 bg-opacity-20`}
                                    style={{ height: '80px' }}
                                    data-track-id={pullTrack.id}
                                  >
                                    {(() => {
                                      console.log(`🎨 Pull 트랙 웨이브폼 영역: ${pullTrack.id}`);
                                      console.log(`🎨 Pull 트랙 웨이브폼 색상: ${pullTrack.color}`);
                                      return null;
                                    })()}
                                    
                                    {isLoading && (
                                      <div className='absolute inset-0 flex items-center justify-center'>
                                        <div className='text-sm text-gray-400'>
                                          Loading...
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-gray-800 rounded mb-2">
                                {(() => {
                                  console.log(`🎨 ${instrumentType} Pull 트랙 없음`);
                                  return null;
                                })()}
                                <div className="text-white text-sm">No Pull track for {instrumentType}</div>
                              </div>
                            )}
                            </div>
                          );
                        }
                      )
                    ) : (
                      <div className="p-6 text-center">
                        {(() => {
                          console.log("🎨 트랙이 없어서 빈 화면 표시");
                          return null;
                        })()}
                        <div className="text-gray-400 text-lg">No tracks available</div>
                        <div className="text-gray-500 text-sm mt-2">
                          {isLoading ? 'Loading tracks...' : 'No comparison data found'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 멀티트랙 컨테이너 - 트랙 위에 절대 위치로 배치 */}
                  <div
                    ref={containerRef}
                    className='absolute inset-0 z-10 ml-80'
                    onClick={handleSeek}
                    style={{
                      pointerEvents: 'auto',
                      background: 'transparent'
                    }}
                  >
                    {(() => {
                      console.log("🎨 멀티트랙 컨테이너 렌더링");
                      console.log("🎨 컨테이너 ref:", !!containerRef.current);
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PR_Page;