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

// 테스트용 목업 데이터
const mockStemData: StemStreamingInfo[] = [
  {
    id: '1',
    fileName: 'Drums - Main Beat',
    category: 'drums',
    tag: 'kick',
    key: 'A minor',
    description: 'Main drum beat with kick and snare',
    presignedUrl: '/audio/Track_ex/1.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '1',
      username: 'SELLY'
    },
    uploadedAt: '2025-01-08T10:30:00Z'
  },
  {
    id: '2',
    fileName: 'Bass - Groove Line',
    category: 'bass',
    tag: 'groove',
    key: 'A minor',
    description: 'Groovy bass line foundation',
    presignedUrl: '/audio/Track_ex/2.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '2',
      username: 'MARCUS'
    },
    uploadedAt: '2025-01-08T10:35:00Z'
  },
  {
    id: '3',
    fileName: 'Guitar - Lead Melody',
    category: 'guitar',
    tag: 'lead',
    key: 'A minor',
    description: 'Lead guitar melody with blues rock feel',
    presignedUrl: '/audio/Track_ex/3.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '3',
      username: 'ALEX'
    },
    uploadedAt: '2025-01-08T10:40:00Z'
  },
  {
    id: '4',
    fileName: 'Synth - Pad Atmosphere',
    category: 'synth',
    tag: 'pad',
    key: 'A minor',
    description: 'Atmospheric synth pad for ambience',
    presignedUrl: '/audio/Track_ex/4.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '4',
      username: 'JENNY'
    },
    uploadedAt: '2025-01-08T10:45:00Z'
  },
  {
    id: '5',
    fileName: 'Vocal - Main Harmony',
    category: 'vocal',
    tag: 'harmony',
    key: 'A minor',
    description: 'Main vocal harmony track',
    presignedUrl: '/audio/Track_ex/5.wav',
    metadata: {
      duration: 180,
      fileSize: 46137344,
      sampleRate: 44100,
      channels: 2,
      format: 'wav'
    },
    uploadedBy: {
      id: '5',
      username: 'SARAH'
    },
    uploadedAt: '2025-01-08T10:50:00Z'
  }
];

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
  const [useTestData, setUseTestData] = useState(true); // 테스트 모드 토글
  const { user } = useAuth();

  // 트랙 데이터와 스테이지 목록 로드
  useEffect(() => {
    const loadTrackData = async () => {
      if (!trackId) return;

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

        // 스테이지 목록 가져오기
        const trackStages = await getTrackStages(trackId);
        setStages(trackStages);

      } catch (error) {
        console.error('Failed to load track data:', error);
        // 스테이지 목록 로드 실패 시 목업 데이터 사용
        setStages([
          {
            id: 'stage-1',
            title: 'Initial Version',
            description: 'First version of the track',
            version: 1,
            status: 'active',
            created_at: '2025-01-08T10:00:00Z',
            track: { id: trackId || '1' } as any,
            user: { id: '1', username: 'SELLY' } as any,
            stage_reviewers: [],
            version_stems: [],
            upstreams: [],
            guide_path: undefined
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadTrackData();
  }, [trackId]);

  // 최신 버전의 스템들 로드
  const loadLatestStems = async () => {
    if (!trackId || stages.length === 0) return;

    try {
      setStemsLoading(true);
      
      if (useTestData) {
        // 테스트 모드: 목업 데이터 사용
        setTimeout(() => {
          setStems(mockStemData);
          setStemsLoading(false);
        }, 1000); // 로딩 효과를 위한 지연
        return;
      }

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
  }, [stages, useTestData]);

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

  const toggleTestMode = () => {
    setUseTestData(!useTestData);
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
        {/* 테스트 모드 토글 버튼 */}
        <div className="mb-4">
          <button
            onClick={toggleTestMode}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              useTestData 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {useTestData ? '테스트 모드 ON' : '테스트 모드 OFF'}
          </button>
        </div>

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
        versionNumber={stages.length > 0 ? Math.max(...stages.map(s => s.version)).toString() : '1'}
        loading={stemsLoading}
      />
    </div>
  );
};

export default TrackPage;
