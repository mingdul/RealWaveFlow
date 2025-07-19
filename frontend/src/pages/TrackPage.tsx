import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Track, Stage } from '../types/api';
import {
  TrackHeader,
  TrackInfoCard,
  OpenStageModal,
  StemListModal,
  StageHis,
} from '../components';
import { useAuth } from '../contexts/AuthContext';
import {
  getTrackStages,
  createStage,
  getBackToPreviousStage,
} from '../services/stageService';
import { createStageReviewer } from '../services/stageReviewerService';
import streamingService, {
  StemStreamingInfo,
} from '../services/streamingService';
import trackService from '../services/trackService';
 

interface TrackPageProps {}

// 모던한 로딩 컴포넌트
const ModernLoader: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
    <div className="relative">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple-300 border-t-transparent shadow-lg"></div>
      <div className="absolute inset-0 h-16 w-16 animate-ping rounded-full border-4 border-purple-400 opacity-20"></div>
    </div>
  </div>
);

// 에러 상태 컴포넌트
const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
    <div className="text-center p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">{message}</h1>
      <p className="text-gray-400">Please try again later</p>
    </div>
  </div>
);

const TrackPage: React.FC<TrackPageProps> = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [track, setTrack] = useState<Track | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [stems, setStems] = useState<StemStreamingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stemsLoading, setStemsLoading] = useState(false);
  const [isOpenStageModalOpen, setIsOpenStageModalOpen] = useState(false);
  const [isStemListModalOpen, setIsStemListModalOpen] = useState(false);
  const [selectedStageVersion, setSelectedStageVersion] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // 트랙 데이터와 스테이지 목록 로드
  useEffect(() => {
    const loadTrackData = async () => {
      if (!trackId) {
        setError('Track ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('[DEBUG][TrackPage] Loading track data for ID:', trackId);
        
        const response = await trackService.getTrackById(trackId);
        if (!response.data) {
          throw new Error('Track not found');
        }
        
        setTrack(response.data);
        
        // 스테이지 목록 가져오기
        const trackStages = await getTrackStages(trackId);
        setStages(trackStages || []);
        
      } catch (error) {
        console.error('[ERROR][TrackPage] Failed to load track data:', error);
        setError('Failed to load track data');
        setStages([]);
      } finally {
        setLoading(false);
      }
    };

    loadTrackData();
  }, [trackId]);

  // 승인된 스테이지의 스템들 로드
  const loadApproveStems = async () => {
    if (!trackId || stages.length === 0) return;

    try {
      setStemsLoading(true);

      // active가 아닌 모든 스테이지 중 가장 높은 버전 선택
      const nonActiveStages = stages.filter(stage => stage.status !== 'active');
      if (nonActiveStages.length === 0) {
        console.warn('[WARN][TrackPage] No non-active stages found');
        setStems([]);
        return;
      }

      const latestNonActiveStage = nonActiveStages.reduce((prev, current) => 
        current.version > prev.version ? current : prev
      );

      const response = await streamingService.getMasterStemStreams(
        trackId,
        latestNonActiveStage.version
      );
      
      if (response.data) {
        setStems(response.data.stems);
        setSelectedStageVersion(latestNonActiveStage.version);
      } else {
        console.error('[ERROR][TrackPage] Failed to load stems:', response.message);
        setStems([]);
      }
    } catch (error) {
      console.error('[ERROR][TrackPage] Error loading stems:', error);
      setStems([]);
    } finally {
      setStemsLoading(false);
    }
  };

  // 스테이지가 로드되면 활성 스테이지의 스템들 로드
  useEffect(() => {
    if (stages.length > 0) {
      loadApproveStems();
    }
  }, [stages, trackId]);

  // 버전별 스템 로드
  const loadStemsByVersion = async (version: number) => {
    if (!trackId) return;

    try {
      setStemsLoading(true);
      const response = await streamingService.getMasterStemStreams(trackId, version);
      
      if (response.data) {
        console.log('[DEBUG][TrackPage] Loaded stems for version:', version);
        setStems(response.data.stems);
        setSelectedStageVersion(version);
      } else {
        console.error('[ERROR][TrackPage] Failed to load stems:', response.message);
        setStems([]);
      }
    } catch (error) {
      console.error('[ERROR][TrackPage] Error loading stems by version:', error);
      setStems([]);
    } finally {
      setStemsLoading(false);
    }
  };

  // Event handlers
  const handleBack = () => navigate('/dashboard');

  const handleShowStage = (stageId: string) => {
    navigate(`/stage/${stageId}`);
  }
  
  const handlePlay = () => {
    console.log('[DEBUG][TrackPage] Playing track:', track?.id);
    // TODO: 트랙 재생 로직 구현
  };

  const handleShowAllStems = () => setIsStemListModalOpen(true);

  const handleRollBack = async () => {
    if (!trackId) return;
    
    try {
      console.log('[DEBUG][TrackPage] Rolling back to version:', selectedStageVersion);
      const response = await getBackToPreviousStage(trackId, selectedStageVersion);
      
      if (response.success) {
        await loadStemsByVersion(selectedStageVersion);
        
      } else {
        console.error('[ERROR][TrackPage] Failed to rollback:', response);
      }
      navigate(0);
    } catch (error) {
      console.error('[ERROR][TrackPage] Rollback error:', error);
    }
  };

  const handleStageClick = async (stage: Stage) => {
    if (stage.status === 'active') {
      navigate(`/stage/${stage.id}`);
    } else {
      await loadStemsByVersion(stage.version);
      setSelectedStageVersion(stage.version);
      console.log('[DEBUG][TrackPage] Selected stage version:', stage.version);
    }
  };

  const handleOpenStageSubmit = async (description: string, reviewerIds: string[]) => {
    if (!user || !trackId) {
      console.error('[ERROR][TrackPage] User or track ID not available');
      return;
    }

    try {
      const stageData = {
        title: `Stage ${stages.length + 1}`,
        description,
        track_id: trackId,
        user_id: user.id,
        status: 'active',
      };

      const newStage = await createStage(stageData);
      newStage.user = user;
      
      // 선택된 리뷰어들에 대해 stage reviewer 생성
      if (reviewerIds && reviewerIds.length > 0) {
        try {
          const reviewerPromises = reviewerIds.map(userId => 
            createStageReviewer({
              stage_id: newStage.id,
              user_id: userId
            })
          );
          
          await Promise.all(reviewerPromises);
          console.log('[DEBUG][TrackPage] Stage reviewers created successfully');
        } catch (reviewerError) {
          console.error('[ERROR][TrackPage] Failed to create some stage reviewers:', reviewerError);
          // Stage는 생성되었으므로 경고만 표시하고 계속 진행
        }
      }
      
      setStages(prevStages => [...prevStages, newStage]);
      setIsOpenStageModalOpen(false);
      
      console.log('[DEBUG][TrackPage] New stage created:', newStage);
    } catch (error) {
      console.error('[ERROR][TrackPage] Failed to create stage:', error);
    }
  };

  // Helper functions
  const getActiveStage = () => {
    const activeStage = stages.find(stage => stage.status === 'active');
    console.log('[DEBUG][TrackPage] Active stage:', activeStage);
    return activeStage;
  };

  const getSelectedStage = () => {
    return stages.find(stage => stage.version === selectedStageVersion);
  };

  const isVersion1 = () => {
    const activeStage = getActiveStage();
    const isV1 = activeStage?.version === 1;
    console.log('[DEBUG][TrackPage] Is version 1:', isV1);
    return isV1;
  };

  // Render states
  if (loading) {
    return <ModernLoader />;
  }

  if (error || !track) {
    return <ErrorState message={error || 'Track not found'} />;
  }

  const isActiveStage = !!getActiveStage();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-stone-950 via-amber-950 to-neutral-950 overflow-hidden">
      {/* 기하학적 네트워크 배경 */}
      <div className="absolute inset-0">
        {/* SVG 네트워크 패턴 */}
        <svg
          className="absolute inset-0 w-full h-full opacity-25"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#92400e" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#a16207" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#78716c" stopOpacity="0.6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* 네트워크 연결선들 */}
          <g stroke="url(#lineGradient)" strokeWidth="1" fill="none" filter="url(#glow)">
            {/* 왼쪽 상단 클러스터 */}
            <path d="M100,100 L250,180 L180,280 L80,220 Z" />
            <path d="M250,180 L400,120 L380,250 L250,300" />
            <path d="M180,280 L320,350 L250,480 L120,420" />
            
            {/* 중앙 메인 네트워크 */}
            <path d="M500,200 L700,150 L800,300 L650,400 L450,350 Z" />
            <path d="M700,150 L920,180 L880,320 L800,300" />
            <path d="M800,300 L950,450 L750,520 L650,400" />
            <path d="M650,400 L480,500 L450,350" />
            
            {/* 우측 클러스터 */}
            <path d="M1200,100 L1400,150 L1350,280 L1150,250 Z" />
            <path d="M1400,150 L1600,200 L1580,350 L1350,280" />
            <path d="M1350,280 L1500,400 L1300,480 L1150,380" />
            
            {/* 하단 네트워크 */}
            <path d="M200,600 L450,650 L400,800 L180,750 Z" />
            <path d="M450,650 L680,620 L720,780 L500,820" />
            <path d="M680,620 L900,580 L950,720 L720,780" />
            <path d="M900,580 L1150,600 L1200,750 L950,720" />
            
            {/* 연결 브릿지들 */}
            <path d="M400,120 L500,200" />
            <path d="M650,400 L720,620" />
            <path d="M800,300 L1150,250" />
            <path d="M320,350 L450,650" />
            <path d="M950,450 L1200,600" />
            <path d="M1350,280 L1500,400" />
          </g>
          
          {/* 네트워크 노드들 */}
          <g>
            {/* 메인 노드들 */}
            <circle cx="100" cy="100" r="4" fill="#92400e" filter="url(#glow)" />
            <circle cx="250" cy="180" r="3" fill="#a16207" filter="url(#glow)" />
            <circle cx="500" cy="200" r="5" fill="#78716c" filter="url(#glow)" />
            <circle cx="700" cy="150" r="4" fill="#92400e" filter="url(#glow)" />
            <circle cx="800" cy="300" r="4" fill="#a16207" filter="url(#glow)" />
            <circle cx="650" cy="400" r="3" fill="#78716c" filter="url(#glow)" />
            <circle cx="1200" cy="100" r="4" fill="#92400e" filter="url(#glow)" />
            <circle cx="1400" cy="150" r="3" fill="#a16207" filter="url(#glow)" />
            
            {/* 작은 노드들 */}
            <circle cx="180" cy="280" r="2" fill="#92400e" opacity="0.8" />
            <circle cx="380" cy="250" r="2" fill="#a16207" opacity="0.8" />
            <circle cx="920" cy="180" r="2" fill="#78716c" opacity="0.8" />
            <circle cx="1350" cy="280" r="2" fill="#92400e" opacity="0.8" />
            <circle cx="450" cy="650" r="3" fill="#a16207" filter="url(#glow)" />
            <circle cx="680" cy="620" r="3" fill="#78716c" filter="url(#glow)" />
            <circle cx="900" cy="580" r="4" fill="#92400e" filter="url(#glow)" />
            
            {/* 미세 노드들 */}
            <circle cx="320" cy="350" r="1.5" fill="#92400e" opacity="0.6" />
            <circle cx="880" cy="320" r="1.5" fill="#a16207" opacity="0.6" />
            <circle cx="1500" cy="400" r="1.5" fill="#78716c" opacity="0.6" />
            <circle cx="720" cy="780" r="1.5" fill="#92400e" opacity="0.6" />
          </g>
        </svg>
        
        {/* 애니메이션 파티클들 */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-amber-600 rounded-full animate-pulse opacity-60"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-orange-700 rounded-full animate-pulse opacity-40 delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-stone-600 rounded-full animate-pulse opacity-50 delay-2000"></div>
          <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-amber-600 rounded-full animate-pulse opacity-60 delay-3000"></div>
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-orange-700 rounded-full animate-pulse opacity-40 delay-500"></div>
        </div>
      </div>
      
      {/* 어두운 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-950/70 via-transparent to-stone-950/90"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-transparent to-transparent"></div>
      
      {/* 메인 컨텐츠 */}
      <div className="relative z-10 overflow-y-auto scrollbar-hide">
        <div className="backdrop-blur-sm">
          <TrackHeader
            onBack={handleBack}
          />

          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* 트랙 정보 카드 */}
            <div className="transform transition-all duration-300 hover:scale-[1.02]">
              <TrackInfoCard
                track={track}
                stems={stems}
                stemsLoading={stemsLoading}
                onPlay={handlePlay}
                versionNumber={selectedStageVersion.toString()}
                onShowAllStems={handleShowAllStems}
                onRollBack={handleRollBack}
                stageId={getSelectedStage()?.id}
              />
            </div>

            {/* 스테이지 히스토리 */}
            <div className="transform transition-all duration-300">
              <StageHis
                stages={stages}
                onStageSelect={handleStageClick}
                onOpenStageClick={() => setIsOpenStageModalOpen(true)}
                disableStageOpening={isVersion1()}
                isActiveStage={isActiveStage}
              />
            </div>
          </div>
        </div>

        {/* 모달들 */}
        <OpenStageModal
          isOpen={isOpenStageModalOpen}
          onClose={() => setIsOpenStageModalOpen(false)}
          onSubmit={handleOpenStageSubmit}
          trackId={trackId || ''}
        />

        <StemListModal
          isOpen={isStemListModalOpen}
          onClose={() => setIsStemListModalOpen(false)}
          stems={stems}
          versionNumber={selectedStageVersion.toString()}
          loading={stemsLoading}
          onRollBack={handleRollBack}
          onShowStage={handleShowStage}
          stageId={getSelectedStage()?.id}
        />
      </div>
    </div>
  );
};

export default TrackPage;