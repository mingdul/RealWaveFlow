import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Track, Stage } from '../types/api';
import {
  OpenStageModal,
  StemListModal,
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
import { 
  ChevronLeft, 
  Settings, 
  Play, 
  Pause, 
  Clock, 
  CheckCircle, 
  GitBranch, 
  Plus, 
  Music, 
  Users,
  Calendar,
  Zap,
  Activity,
  Star,
  MoreHorizontal,
  Download,
  Share2,
  Heart,
  Eye
} from 'lucide-react';
import PresignedImage from '../components/PresignedImage';
import { NotificationBell, Logo } from '../components';

interface TrackPageProps {}

// 현대적인 로딩 컴포넌트
const ModernLoader: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
    <div className="relative">
      <div className="h-20 w-20 animate-spin rounded-full border-4 border-blue-300 border-t-transparent shadow-lg"></div>
      <div className="absolute inset-0 h-20 w-20 animate-ping rounded-full border-4 border-blue-400 opacity-20"></div>
      <div className="absolute inset-4 h-12 w-12 animate-pulse rounded-full bg-blue-500/20"></div>
    </div>
  </div>
);

// 에러 상태 컴포넌트
const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
    <div className="text-center p-10 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl max-w-md">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white mb-3">{message}</h1>
      <p className="text-gray-400">Please try again later</p>
    </div>
  </div>
);

// 내부 TrackHeader 컴포넌트
const TrackHeader: React.FC<{ onBack: () => void; onSettingsClick: () => void }> = ({ onBack, onSettingsClick }) => {
  const navigate = useNavigate();
  
  return (
    <header className="bg-white/5 backdrop-blur-md border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-105"
          >
            <ChevronLeft size={20} />
          </button>
          <Logo />
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white/80 hover:text-white transition-colors duration-200 font-medium"
          >
            Dashboard
          </button>
        </nav>
        
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-105"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

// 내부 TrackInfoCard 컴포넌트
const TrackInfoCard: React.FC<{
  track: Track;
  stems: StemStreamingInfo[];
  stemsLoading: boolean;
  onPlay: () => void;
  versionNumber: string;
  onShowAllStems: () => void;
  onRollBack: () => void;
  stageId?: string;
}> = ({ track, stems, stemsLoading, onPlay, versionNumber, onShowAllStems, onRollBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const handlePlayClick = () => {
    setIsPlaying(!isPlaying);
    onPlay();
  };
  
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Album Cover */}
        <div className="flex-shrink-0">
          <div className="relative group">
            <PresignedImage
              trackId={track.id}
              imageUrl={track.image_url}
              alt={track.title}
              className="w-48 h-48 lg:w-56 lg:h-56 rounded-xl shadow-lg object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
              <button
                onClick={handlePlayClick}
                className="p-4 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-200 hover:scale-110"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Track Details */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 truncate">{track.title}</h1>
            <div className="flex items-center gap-4 text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(track.created_date).toLocaleDateString('en-US')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {track.owner_id.username}
              </span>
            </div>
          </div>

          {/* Track Metadata */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30">
              {track.genre}
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
              {track.bpm} BPM
            </span>
            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm border border-green-500/30">
              {track.key_signature}
            </span>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm border border-orange-500/30">
              Version {versionNumber}
            </span>
          </div>

          {/* Description */}
          {track.description && (
            <p className="text-gray-300 mb-4 leading-relaxed">
              {track.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onShowAllStems}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <Music className="w-4 h-4" />
              View Stems ({stems.length})
            </button>
            <button
              onClick={onRollBack}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Roll Back
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 hover:scale-105 backdrop-blur-sm">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 hover:scale-105 backdrop-blur-sm">
              <Heart className="w-4 h-4" />
              Like
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-gray-400">
              <Eye className="w-4 h-4" />
              <span className="text-sm">142 views</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Heart className="w-4 h-4" />
              <span className="text-sm">23 likes</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Activity className="w-4 h-4" />
              <span className="text-sm">{stems.length} stems</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 내부 StageCard 컴포넌트
const StageCard: React.FC<{
  stage: Stage;
  isSelected: boolean;
  isActive: boolean;
  onClick: (stage: Stage) => void;
}> = ({ stage, isSelected, isActive, onClick }) => {
  const getStatusColor = () => {
    switch (stage.status) {
      case 'active':
        return 'from-blue-500 to-purple-600';
      case 'approved':
        return 'from-green-500 to-emerald-600';
      case 'rejected':
        return 'from-red-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (stage.status) {
      case 'active':
        return <Clock className="w-5 h-5" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5" />;
      case 'rejected':
        return <Activity className="w-5 h-5" />;
      default:
        return <GitBranch className="w-5 h-5" />;
    }
  };

  return (
    <div
      onClick={() => onClick(stage)}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl
        ${isSelected 
          ? 'bg-white/20 border-2 border-white/40 shadow-lg' 
          : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
        }
        ${isActive ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
      `}
    >
      {/* Status Badge */}
      <div className={`absolute -top-2 -right-2 p-2 rounded-full bg-gradient-to-r ${getStatusColor()} shadow-lg`}>
        {getStatusIcon()}
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-white mb-1">V{stage.version}</div>
        <div className="text-sm text-gray-400 capitalize mb-2">{stage.status}</div>
        
        {stage.user && (
          <div className="text-xs text-gray-500">
            by {stage.user.username}
          </div>
        )}
        
        {stage.created_at && (
          <div className="text-xs text-gray-500 mt-1">
            {new Date(stage.created_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl animate-pulse"></div>
      )}
    </div>
  );
};

// 내부 StageHistory 컴포넌트
const StageHistory: React.FC<{
  stages: Stage[];
  onStageSelect: (stage: Stage) => void;
  onOpenStageClick: () => void;
  disableStageOpening: boolean;
  isActiveStage: boolean;
}> = ({ stages, onStageSelect, onOpenStageClick, disableStageOpening, isActiveStage }) => {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

  const handleStageClick = (stage: Stage) => {
    setSelectedStage(stage);
    onStageSelect(stage);
  };

  const sortedStages = [...stages].sort((a, b) => a.version - b.version);

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Stage History</h2>
            <p className="text-gray-400 text-sm">Track your creative journey</p>
          </div>
        </div>
        
        {!disableStageOpening && !isActiveStage && (
          <button
            onClick={onOpenStageClick}
            className="group relative px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium text-white shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>New Stage</span>
            </div>
            <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        )}
      </div>

      {/* Stages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {sortedStages.map((stage) => (
          <StageCard
            key={stage.id}
            stage={stage}
            isSelected={selectedStage?.id === stage.id}
            isActive={stage.status === 'active'}
            onClick={handleStageClick}
          />
        ))}
        
        {/* Add Stage Card */}
        {!disableStageOpening && !isActiveStage && (
          <div
            onClick={onOpenStageClick}
            className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-dashed border-purple-400/50 hover:border-purple-400 cursor-pointer transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center group"
          >
            <Plus className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform duration-200" />
            <span className="text-sm text-purple-400 font-medium">Add Stage</span>
          </div>
        )}
      </div>

      {/* Stage Details */}
      {selectedStage && (
        <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-2">
            Stage {selectedStage.version} Details
          </h3>
          <p className="text-gray-400 text-sm mb-3">
            {selectedStage.description || 'No description available'}
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Created: {new Date(selectedStage.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span>Status: {selectedStage.status}</span>
            {selectedStage.user && (
              <>
                <span>•</span>
                <span>By: {selectedStage.user.username}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <TrackHeader
          onBack={handleBack}
          onSettingsClick={() => console.log('Settings clicked')}
        />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-h-[calc(100vh-120px)]">
            {/* Left Column - Track Info */}
            <div className="xl:col-span-2">
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

            {/* Right Column - Stage History */}
            <div className="xl:col-span-1">
              <StageHistory
                stages={stages}
                onStageSelect={handleStageClick}
                onOpenStageClick={() => setIsOpenStageModalOpen(true)}
                disableStageOpening={isVersion1()}
                isActiveStage={isActiveStage}
              />
            </div>
          </div>
        </main>

        {/* Modals */}
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