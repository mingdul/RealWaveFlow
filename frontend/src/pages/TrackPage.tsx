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
      try {
        setLoading(true);
        // TODO: 실제 트랙 API 호출로 대체 필요
        const mockTrack: Track = {
          id: trackId,
          name: '버전 넘버',
          description: '드럼 메세지 드럼이랑 베이스 바꾼 버전입니다.',
          genre: 'Blues rock',
          bpm: '165 BPM',
          key_signature: 'A minor',
          created_date: '25.07.02',
          updated_date: '25.07.02',
          owner_id: {
            id: '1',
            email: 'selly@example.com',
            username: 'SELLY',
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          }
        };
        setTrack(mockTrack);
        console.log('[DEBUG][TrackPage] Set mock track:', mockTrack);
        // 스테이지 목록 가져오기
        const trackStages = await getTrackStages(trackId);
        setStages(trackStages || []);
        console.log('[DEBUG][TrackPage] Loaded stages:', trackStages);
      } catch (error) {
        console.error('Failed to load track data:', error);
        setStages([]);
      } finally {
        setLoading(false);
        console.log('[DEBUG][TrackPage] Loading finished');
      }
    };
    loadTrackData();
  }, [trackId]);

  // 최신 버전의 스템들 로드
  const loadLatestStems = async () => {
    if (!trackId || stages.length === 0) return;

    try {
      setStemsLoading(true);
      
      // 실제 API 호출
      const latestVersion = Math.max(...stages.map(s => s.version));
      const response = await streamingService.getMasterStemStreams(trackId, latestVersion);
      
      if (response.success && response.data) {
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

  // 스테이지가 로드되면 스템들 로드
  useEffect(() => {
    if (stages.length > 0) {
      loadLatestStems();
    }
  }, [stages]);

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

  const handleStageClick = () => {
    // TODO: 트랙 재생 로직 구현
    console.log('stage click');
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
      
      console.log('New stage created:', newStage);
      // TODO: Reviewers 기능 구현 필요
      
      setIsOpenStageModalOpen(false);
    } catch (error) {
      console.error('Failed to create stage:', error);
    }
  };

  if (loading) {
    console.log('[DEBUG][TrackPage] Loading...');
    return (
      <div className="bg-[#2a2a2a] min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!track) {
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
        versionNumber={stages.length > 0 ? Math.max(...stages.map(s => s.version).filter(v => typeof v === 'number')).toString(): '1'}
        loading={stemsLoading}
      />
    </div>
  );
};

export default TrackPage;
