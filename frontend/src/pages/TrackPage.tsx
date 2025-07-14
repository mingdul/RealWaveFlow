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
import trackService from '../services/trackService';
import { getTrackStages, createStage } from '../services/stageService';
import streamingService, { StemStreamingInfo } from '../services/streamingService';

const TrackPage: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const [track, setTrack] = useState<Track | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [stems, setStems] = useState<StemStreamingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stemsLoading, setStemsLoading] = useState(false);
  const [isOpenStageModalOpen, setIsOpenStageModalOpen] = useState(false);
  const [isStemListModalOpen, setIsStemListModalOpen] = useState(false);
  const { user } = useAuth();

  // 트랙 데이터와 모든 스테이지 로드
  useEffect(() => {
    const loadTrackData = async () => {
      if (!trackId) return;

      try {
        setLoading(true);
        const trackResponse = await trackService.getTrackById(trackId);
        setTrack(trackResponse.data.data || null);

        const trackStages = await getTrackStages(trackId);
        setStages(trackStages || []);
        
        // 'active' 상태의 스테이지를 찾아 초기 선택 스테이지로 설정
        const activeStage = trackStages?.find((s: Stage) => s.status === 'active') || trackStages?.[0] || null;
        setSelectedStage(activeStage);

      } catch (error) {
        console.error('Failed to load track data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTrackData();
  }, [trackId]);

  // 선택된 스테이지가 변경될 때마다 스템 목록 로드
  useEffect(() => {
    const loadStemsForStage = async () => {
      if (!trackId || !selectedStage) {
        setStems([]);
        return;
      }

      try {
        setStemsLoading(true);
        const response = await streamingService.getMasterStemStreams(trackId, selectedStage.version);
        setStems(response.data?.stems || []);
      } catch (error) {
        console.error(`Failed to load stems for stage ${selectedStage.version}:`, error);
        setStems([]);
      } finally {
        setStemsLoading(false);
      }
    };

    loadStemsForStage();
  }, [selectedStage, trackId]);

  const handleBack = () => navigate('/dashboard');
  const handlePlay = () => console.log('Playing track:', track?.id);
  const handleShowAllStems = () => setIsStemListModalOpen(true);
  const handleRollBack = () => console.log('Rolling back track:', track?.id);
  const handleStageSelect = (stage: Stage) => setSelectedStage(stage);

  const handleOpenStageSubmit = async (description: string) => {
    if (!user || !trackId) return;

    try {
      const stageData = {
        title: `Stage ${stages.length + 1}`,
        description,
        track_id: trackId,
        user_id: user.id,
        status: 'active' // 새 스테이지는 항상 active로 생성된다고 가정
      };

      const newStage = await createStage(stageData);
      setStages(prevStages => [...prevStages, newStage]);
      setSelectedStage(newStage); // 새로 생성된 스테이지를 선택
      setIsOpenStageModalOpen(false);
    } catch (error) {
      console.error('Failed to create stage:', error);
    }
  };

  const isVersion1 = selectedStage?.version === 1;

  if (loading) {
    return (
      <div className="bg-[#2a2a2a] min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="bg-[#2a2a2a] min-h-screen flex justify-center items-center">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-300">Track not found</h1>
        </div>
      </div>
    );
  }

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
          stage={selectedStage}
        />

        <StageHistory
          stages={stages}
          selectedStage={selectedStage}
          onStageSelect={handleStageSelect}
          onOpenStageClick={() => setIsOpenStageModalOpen(true)}
          disableStageOpening={isVersion1}
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
        versionNumber={selectedStage?.version.toString() || '1'}
        loading={stemsLoading}
      />
    </div>
  );
};

export default TrackPage;
