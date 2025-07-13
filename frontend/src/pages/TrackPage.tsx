import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Track, Version } from '../types/api';
import { 
  TrackHeader, 
  TrackInfoCard, 
  VersionHistory, 
  OpenStageModal, 
  StemListModal 
} from '../components';

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
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpenStageModalOpen, setIsOpenStageModalOpen] = useState(false);
  const [isStemListModalOpen, setIsStemListModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  // Mock data - 실제 구현에서는 API 호출로 대체
  useEffect(() => {
    const mockTrack: Track = {
      id: trackId || '1',
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

    const mockVersions: Version[] = [
      {
        id: '1',
        version_number: '1',
        commit_message: 'Initial version',
        branch_id: 'main',
        created_by: 1,
        created_at: '25.06.22',
        created_by_user: { id: 1, email: 'andy@example.com', username: 'ANDY', created_at: '2024-01-01', updated_at: '2024-01-01' }
      },
      {
        id: '2',
        version_number: '2',
        commit_message: 'Drum High',
        branch_id: 'main',
        created_by: 1,
        created_at: '25.06.22',
        created_by_user: { id: 1, email: 'andy@example.com', username: 'ANDY', created_at: '2024-01-01', updated_at: '2024-01-01' }
      },
      {
        id: '3',
        version_number: '3',
        commit_message: 'BASS MIX',
        branch_id: 'main',
        created_by: 2,
        created_at: '25.06.27',
        created_by_user: { id: 2, email: 'max@example.com', username: 'MAX', created_at: '2024-01-01', updated_at: '2024-01-01' }
      },
      {
        id: '4',
        version_number: '4',
        commit_message: 'Vocal Add',
        branch_id: 'main',
        created_by: 3,
        created_at: '25.07.02',
        created_by_user: { id: 3, email: 'selly@example.com', username: 'SELLY', created_at: '2024-01-01', updated_at: '2024-01-01' }
      }
    ];

    setTrack(mockTrack);
    setVersions(mockVersions);
    setLoading(false);
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

  const handleVersionSelect = (version: Version) => {
    setSelectedVersion(version);
    console.log('Selected version:', version.version_number);
  };

  const handleOpenStageSubmit = (description: string, reviewers: any[]) => {
    // Create new version with the stage information
    const newVersion: Version = {
      id: (versions.length + 1).toString(),
      version_number: (versions.length + 1).toString(),
      commit_message: description.substring(0, 50) + (description.length > 50 ? '...' : ''),
      branch_id: 'main',
      created_by: 1, // Current user
      created_at: new Date().toLocaleDateString('ko-KR', { 
        year: '2-digit', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\./g, '.').replace(/\.$/, ''),
      created_by_user: { 
        id: 1, 
        email: 'current@example.com', 
        username: 'CURRENT', 
        created_at: '2024-01-01', 
        updated_at: '2024-01-01' 
      }
    };

    setVersions([...versions, newVersion]);
    console.log('New stage opened:', { description, reviewers });
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

        <VersionHistory
          versions={versions}
          onVersionSelect={handleVersionSelect}
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
        versionNumber={selectedVersion?.version_number || '1'}
      />
    </div>
  );
};

export default TrackPage;
