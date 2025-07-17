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
import streamingService, {
  StemStreamingInfo,
} from '../services/streamingService';
import trackService from '../services/trackService';
 

interface ProjectPageProps {}

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

const ProjectPage: React.FC<ProjectPageProps> = () => {
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
        window.location.reload();
      } else {
        console.error('[ERROR][TrackPage] Failed to rollback:', response);
      }
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

  const handleOpenStageSubmit = async (description: string) => {
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
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 동적 배경 오버레이 */}
      <div className="absolute inset-0 bg-[url('/background.jpg')] bg-cover bg-center opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-purple-900/50 to-black/80"></div>
      
      {/* 메인 컨텐츠 */}
      <div className="relative z-10 min-h-screen overflow-y-auto scrollbar-hide">
        <div className="backdrop-blur-sm">
          <TrackHeader
            onBack={handleBack}
            onNotificationClick={() => console.log('Notification clicked')}
            onSettingsClick={() => console.log('Settings clicked')}
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
        />

        <StemListModal
          isOpen={isStemListModalOpen}
          onClose={() => setIsStemListModalOpen(false)}
          stems={stems}
          versionNumber={selectedStageVersion.toString()}
          loading={stemsLoading}
          onRollBack={handleRollBack}
          stageId={getSelectedStage()?.id}
        />
      </div>
    </div>
  );
};

export default ProjectPage;