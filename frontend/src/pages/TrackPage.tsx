import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Track, Stage } from '../types/api';
import { 
  TrackHeader, 
  TrackInfoCard, 
  OpenStageModal, 
  StemListModal,
  StageHistory 
} from '../components';
import { useAuth } from '../contexts/AuthContext';
import { getTrackStages, createStage} from '../services/stageService';
import streamingService, { StemStreamingInfo } from '../services/streamingService';
import trackService from '../services/trackService';
interface TrackPageProps {}

const TrackPage: React.FC<TrackPageProps> = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const [track, setTrack] = useState<Track | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [stems, setStems] = useState<StemStreamingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stemsLoading, setStemsLoading] = useState(false);
  const [isOpenStageModalOpen, setIsOpenStageModalOpen] = useState(false);
  const [isStemListModalOpen, setIsStemListModalOpen] = useState(false);
  const { user } = useAuth();

  // 트랙 데이터와 스테이지 목록 로드
  useEffect(() => {
    const loadTrackData = async () => {
      if (!trackId) {
        console.log('[DEBUG][TrackPage] No trackId in params:', trackId);
        return;
      }
      console.log('[DEBUG][TrackPage] useEffect triggered, trackId:', trackId);
      if (!trackId) {
        console.log('[DEBUG][TrackPage] No trackId in params:', trackId);
        return;
      }
      console.log('[DEBUG][TrackPage] useEffect triggered, trackId:', trackId);
      try {
        setLoading(true);
        // TODO: 실제 트랙 API 호출로 대체 필요
        const response = await trackService.getTrackById(trackId);
        setTrack(response.data || null);
        // 스테이지 목록 가져오기
        const trackStages = await getTrackStages(trackId);
        setStages(trackStages || []);
      } catch (error) {
        console.error('[DEBUG][TrackPage] Failed to load track data:', error);
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
      
      // status가 'approve'인 스테이지 찾기
      const approveStage = stages.find(stage => stage.status === 'approve');
      if (!approveStage) {
        console.error('No approve stage found');
        setStems([]);
        return;
      }

      // 활성 스테이지의 버전으로 스템들 로드
      const response = await streamingService.getMasterStemStreams(trackId, approveStage.version);
      if (response.data) {
        setStems(response.data.stems);
      } else {
        console.error('Failed to load stems:', response.message);
        setStems([]);
      }
    } catch (error) {
      console.error('Failed to load stems:', error);
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

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handlePlay = () => {
    // TODO: 트랙 재생 로직 구현
    console.log('Playing track:', track?.id);
  };

  const handleShowAllStems = () => {
    setIsStemListModalOpen(true);
  };

  const handleRollBack = () => {
    // TODO: 롤백 로직 구현
    console.log('Rolling back track:', track?.id);
  };

  const handleStageClick = (stage: Stage) => {
    // active한 stage일 때만 StagePage로 라우팅
    if (stage.status === 'active') {
      navigate(`/stage/${stage.id}`);
    } else {
      // 비활성 stage는 트랙 재생 로직 (기존 TODO)
      console.log('Playing track version:', stage.version);
    }
  };

  const handleOpenStageSubmit = async (description: string, ) => {
    if (!user || !trackId) {
      console.error('User or track ID not available');
      return;
    }

    try {
      const stageData = {
        title: `Stage ${stages.length + 1}`,
        description,
        track_id: trackId,
        user_id: user.id,
        status: 'active'
      };

      const newStage = await createStage(stageData);
      setStages(prevStages => [...prevStages, newStage]);

      newStage.user = user;
      
      newStage.user = user;
      console.log('New stage created:', newStage);
      // TODO: Reviewers 기능 구현 필요
      
      setIsOpenStageModalOpen(false);
    } catch (error) {
      console.error('Failed to create stage:', error);
    }
  };

  let isActiveStage = false;

  // 현재 활성 스테이지 가져오기
  const getActiveStage = () => {
    const activeStage = stages.find(stage => stage.status === 'active');
    console.log('[DEBUG][TrackPage] Active stage:', activeStage, 'All stages:', stages);
    if (activeStage) {
      isActiveStage = true;
    }
    return activeStage;
  };

  // 버전 1 여부 확인
  const isVersion1 = () => {
    const activeStage = getActiveStage();
    const isV1 = activeStage?.version === 1;
    console.log('[DEBUG][TrackPage] Is version 1:', isV1, 'Active stage version:', activeStage?.version);
    return isV1;
  };

  if (loading) {
    console.log('[DEBUG][TrackPage] Loading...');
    console.log('[DEBUG][TrackPage] Loading...');
    return (
      <div className="bg-[#2a2a2a] min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!track) {
    console.log('[DEBUG][TrackPage] Track not found, track:', track);
    console.log('[DEBUG][TrackPage] Track not found, track:', track);
    return (
      <div className="bg-[#2a2a2a] min-h-screen flex justify-center items-center">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-300">Track not found</h1>
        </div>
      </div>
    );
  }
  // Move debug log here to avoid linter error in JSX
  console.log('[DEBUG][TrackPage] Rendering main content. track:', track, 'stages:', stages);
  return (
    <div className="bg-[#2a2a2a] min-h-screen">
      <TrackHeader 
        onBack={handleBack}
        onNotificationClick={() => console.log('Notification clicked')}
        onSettingsClick={() => console.log('Settings clicked')}
      />

      <div className="px-6 py-8">
        <TrackInfoCard
          track={track}
          stems={stems}
          stemsLoading={stemsLoading}
          onPlay={handlePlay}
          onShowAllStems={handleShowAllStems}
          onRollBack={handleRollBack}
        />

        <StageHistory
          stages={stages}
          onStageSelect={handleStageClick}
          onOpenStageClick={() => setIsOpenStageModalOpen(true)}
          disableStageOpening={isVersion1()} // 버전 1에서는 스테이지 열기 비활성화
          isActiveStage={isActiveStage}
        />
      </div>

      <OpenStageModal
        isOpen={isOpenStageModalOpen}
        onClose={() => setIsOpenStageModalOpen(false)}
        onSubmit={handleOpenStageSubmit}
      />

      <StemListModal
        isOpen={isStemListModalOpen}
        onClose={() => setIsStemListModalOpen(false)}
        stems={stems}
        versionNumber={getActiveStage()?.version.toString() || '1'}
        loading={stemsLoading}
      />
    </div>
  );
};

export default TrackPage;
