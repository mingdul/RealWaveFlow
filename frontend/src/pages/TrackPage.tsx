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
import { getTrackStages, createStage, getStageDetail } from '../services/stageService';

interface TrackPageProps {}

// Mock stem data for demonstration
const mockStems = [
  {
    id: '1',
    name: 'Drums_Main.wav',
    category: 'Drums',
    duration: '3:45',
    size: '42.1 MB',
    uploader: 'ANDY',
    uploadDate: '25.06.22'
  },
  {
    id: '2',
    name: 'Bass_Groove.wav',
    category: 'Bass',
    duration: '3:45',
    size: '38.7 MB',
    uploader: 'MAX',
    uploadDate: '25.06.27'
  },
  {
    id: '3',
    name: 'Vocal_Main.wav',
    category: 'Vocals',
    duration: '3:45',
    size: '51.3 MB',
    uploader: 'SELLY',
    uploadDate: '25.07.02'
  }
];

const TrackPage: React.FC<TrackPageProps> = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const [track, setTrack] = useState<Track | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpenStageModalOpen, setIsOpenStageModalOpen] = useState(false);
  const [isStemListModalOpen, setIsStemListModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const { user } = useAuth();

  // 트랙 데이터와 스테이지 목록 로드
  useEffect(() => {
    const loadTrackData = async () => {
      if (!trackId) return;

      try {
        setLoading(true);
        
        // Mock 트랙 데이터 - 실제 구현에서는 API 호출로 대체
        const mockTrack: Track = {
          id: trackId,
          name: '버전 넘버',
          description: '드럼 메세지 드럼이랑 베이스 바꾼 버전입니다. 드럼 메세지 드럼이랑 베이스 바꾼 버전입니다. 드럼 메세지 드럼이랑 베이스 바꾼 버전입니다. 드럼 메세지 드럼이랑 베이스 바꾼 버전입니다.',
          genre: 'Blues rock',
          bpm: '165 BPM',
          key_signature: 'A minor',
          created_date: '25.07.02',
          updated_date: '25.07.02',
          owner_id: {
            id: 1,
            email: 'selly@example.com',
            username: 'SELLY',
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          }
        };

        setTrack(mockTrack);

        // 실제 스테이지 목록 가져오기
        const trackStages = await getTrackStages(trackId);
        setStages(trackStages);

      } catch (error) {
        console.error('Failed to load track data:', error);
        // 스테이지가 없는 경우 빈 배열로 설정
        setStages([]);
      } finally {
        setLoading(false);
      }
    };

    loadTrackData();
  }, [trackId]);

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

  const handleStageSelect = (stage: Stage) => {
    setSelectedStage(stage);
    console.log('Selected stage:', stage.title);
  };

  const handleStageClick = async (stage: Stage) => {
    try {
      // 최신 스테이지인지 확인
      const isLatestStage = stages.length > 0 && 
        stage.version === Math.max(...stages.map(s => s.version));

      if (isLatestStage) {
        // 최신 스테이지면 StagePage로 이동
        navigate(`/stage/${stage.id}`);
      } else {
        // 나머지는 상세 조회
        const stageDetail = await getStageDetail(stage.id);
        console.log('Stage detail:', stageDetail);
        // 상세 조회 모달이나 페이지를 여기에 추가할 수 있음
      }
    } catch (error) {
      console.error('Failed to handle stage click:', error);
    }
  };

  const handleOpenStageSubmit = async (description: string, reviewers: any[]) => {
    if (!user || !trackId) {
      console.error('User or track ID not available');
      return;
    }

    try {
      const stageData = {
        title: `Stage ${stages.length + 1}`,
        description,
        track_id: trackId,
        user_id: user.id.toString(),
        status: 'active'
      };

      const newStage = await createStage(stageData);
      setStages(prevStages => [...prevStages, newStage]);
      
      console.log('New stage created:', newStage);
      console.log('Reviewers:', reviewers);
      
      setIsOpenStageModalOpen(false);
    } catch (error) {
      console.error('Failed to create stage:', error);
    }
  };

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
          onPlay={handlePlay}
          onShowAllStems={handleShowAllStems}
          onRollBack={handleRollBack}
        />

        <StageHistory
          stages={stages}
          onStageSelect={(stage) => {
            handleStageSelect(stage);
            handleStageClick(stage);
          }}
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
        stems={mockStems}
        versionNumber={selectedStage?.version.toString() || '1'}
      />
    </div>
  );
};

export default TrackPage;
