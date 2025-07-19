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
import versionStemService from '../services/versionstemService';
 

interface TrackPageCopyProps {}

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

// 트랙 메타정보 카드 컴포넌트 (기본 정보만)
const TrackMetaCard: React.FC<{ track: Track }> = ({ track }) => (
  <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 shadow-md mb-6">
    <h3 className="text-xl font-semibold text-white mb-4">Track Information</h3>
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-300">Title</label>
        <p className="text-base text-white">{track.title}</p>
      </div>
      {track.description && (
        <div>
          <label className="text-sm font-medium text-gray-300">Description</label>
          <p className="text-sm text-gray-200">{track.description}</p>
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-gray-300">Created Date</label>
        <p className="text-base text-white">{new Date(track.created_date).toLocaleDateString()}</p>
      </div>
      {track.genre && (
        <div>
          <label className="text-sm font-medium text-gray-300">Genre</label>
          <p className="text-base text-white">{track.genre}</p>
        </div>
      )}
      {track.bpm && (
        <div>
          <label className="text-sm font-medium text-gray-300">BPM</label>
          <p className="text-base text-white">{track.bpm}</p>
        </div>
      )}
      {track.key_signature && (
        <div>
          <label className="text-sm font-medium text-gray-300">Key</label>
          <p className="text-base text-white">{track.key_signature}</p>
        </div>
      )}
    </div>
  </div>
);

// 버전 정보 패널 컴포넌트
const VersionInfoPanel: React.FC<{ 
  selectedVersion: number; 
  selectedStage: Stage | undefined;
  totalStems: number;
}> = ({ selectedVersion, selectedStage, totalStems }) => (
  <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 shadow-md mb-6">
    <h3 className="text-xl font-semibold text-white mb-4">Current Version</h3>
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-300">Version</label>
        <p className="text-base text-white">v{selectedVersion}</p>
      </div>
      {selectedStage && (
        <>
          <div>
            <label className="text-sm font-medium text-gray-300">Stage Title</label>
            <p className="text-base text-white">{selectedStage.title}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Status</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedStage.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {selectedStage.status}
            </span>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Created</label>
            <p className="text-base text-white">
              {new Date(selectedStage.created_at).toLocaleDateString()}
            </p>
          </div>
        </>
      )}
      <div>
        <label className="text-sm font-medium text-gray-300">Stems Count</label>
        <p className="text-base text-white">{totalStems}</p>
      </div>
    </div>
  </div>
);

// 콜라보레이터 카드 컴포넌트 (실제 멤버 표시)
const CollaboratorsCard: React.FC<{ track: Track }> = ({ track }) => (
  <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 shadow-md mb-6">
    <h3 className="text-xl font-semibold text-white mb-4">Collaborators</h3>
    <div className="space-y-3">
      {/* 트랙 소유자 */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {track.owner_id?.username?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
        <div>
          <p className="text-base text-white">{track.owner_id?.username || 'Unknown User'}</p>
          <p className="text-sm text-gray-400">Owner</p>
        </div>
      </div>
      
      {/* 콜라보레이터들 */}
      {track.collaborators && track.collaborators.length > 0 ? (
        track.collaborators.map((collaborator, index) => (
          <div key={collaborator.id} className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {collaborator.user_id?.username?.charAt(0)?.toUpperCase() || 'C'}
              </span>
            </div>
            <div>
              <p className="text-base text-white">{collaborator.user_id?.username || 'Unknown Collaborator'}</p>
              <p className="text-sm text-gray-400">
                {collaborator.role} • {collaborator.status}
              </p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-400 italic">No collaborators yet</p>
      )}
    </div>
  </div>
);

// 버전 타임라인 컴포넌트
const VersionTimeline: React.FC<{
  stages: Stage[];
  selectedVersion: number;
  onVersionSelect: (version: number) => void;
  stems: StemStreamingInfo[];
  trackId: string;
}> = ({ stages, selectedVersion, onVersionSelect, stems, trackId }) => {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [versionStems, setVersionStems] = useState<{[key: number]: StemStreamingInfo[]}>({});
  const [loadingVersions, setLoadingVersions] = useState<{[key: number]: boolean}>({});

  const sortedStages = [...stages].sort((a, b) => b.version - a.version);

  const toggleExpanded = async (version: number) => {
    if (expandedVersion === version) {
      setExpandedVersion(null);
      return;
    }
    
    setExpandedVersion(version);
    onVersionSelect(version);
    
    // 해당 버전의 스템이 이미 로드되어 있지 않다면 로드
    if (!versionStems[version]) {
      await loadVersionStems(version);
    }
  };

  const loadVersionStems = async (version: number) => {
    setLoadingVersions(prev => ({ ...prev, [version]: true }));
    
    try {
      // 먼저 마스터 스템 스트림 조회 시도
      const masterStemsResponse = await streamingService.getMasterStemStreams(trackId, version);
      
      if (masterStemsResponse.data && masterStemsResponse.data.stems) {
        setVersionStems(prev => ({ 
          ...prev, 
          [version]: masterStemsResponse.data!.stems 
        }));
      } else {
        // 마스터 스템이 없으면 버전 스템 조회 시도
        try {
          const versionStemsData = await versionStemService.getLatestStemsPerCategoryByTrack(trackId, version);
          
          const convertedStems: StemStreamingInfo[] = versionStemsData?.map((stem: any) => ({
            id: stem.id,
            fileName: stem.file_name,
            category: stem.category?.name || 'Unknown',
            tag: stem.key,
            key: stem.key,
            description: '',
            presignedUrl: '',
            metadata: {
              duration: 0,
              fileSize: 0
            },
            uploadedBy: {
              id: stem.user?.id || '',
              username: stem.user?.username || 'Unknown'
            },
            uploadedAt: stem.uploaded_at
          })) || [];
          
          setVersionStems(prev => ({ 
            ...prev, 
            [version]: convertedStems 
          }));
        } catch (error) {
          console.error(`[ERROR] Failed to load stems for version ${version}:`, error);
          setVersionStems(prev => ({ 
            ...prev, 
            [version]: [] 
          }));
        }
      }
    } catch (error) {
      console.error(`[ERROR] Failed to load stems for version ${version}:`, error);
      setVersionStems(prev => ({ 
        ...prev, 
        [version]: [] 
      }));
    } finally {
      setLoadingVersions(prev => ({ ...prev, [version]: false }));
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6 shadow-md">
      <h3 className="text-xl font-semibold text-white mb-6">Version History</h3>
      <div className="relative">
        {/* 타임라인 세로선 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600"></div>
        
        <div className="space-y-6">
          {sortedStages.map((stage, _index) => (
            <div key={stage.id} className="relative flex items-start">
              {/* 타임라인 노드 */}
              <div 
                className={`relative z-10 w-8 h-8 rounded-full border-4 cursor-pointer transition-all duration-200 ${
                  selectedVersion === stage.version
                    ? 'bg-amber-400 border-amber-300 shadow-lg shadow-amber-400/50' 
                    : stage.status === 'active'
                    ? 'bg-green-400 border-green-300 shadow-lg shadow-green-400/50'
                    : 'bg-gray-400 border-gray-300 hover:bg-amber-300'
                }`}
                onClick={() => toggleExpanded(stage.version)}
              >
                <div className="absolute inset-0 rounded-full bg-white/20"></div>
                {stage.status === 'active' && (
                  <div className="absolute inset-1 rounded-full bg-green-400 animate-pulse"></div>
                )}
              </div>
              
              {/* 버전 정보 카드 */}
              <div className="ml-6 flex-1">
                <div 
                  className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedVersion === stage.version ? 'ring-2 ring-amber-400' : 'hover:bg-white/15'
                  }`}
                  onClick={() => toggleExpanded(stage.version)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        Version {stage.version}
                        {stage.status === 'active' && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-300 mt-1">{stage.title}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(stage.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          expandedVersion === stage.version ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* 스템 리스트 아코디언 */}
                  {expandedVersion === stage.version && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <h5 className="text-sm font-medium text-gray-300 mb-3">Stems in this version:</h5>
                      {loadingVersions[stage.version] ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
                          <span className="ml-2 text-sm text-gray-400">Loading stems...</span>
                        </div>
                      ) : versionStems[stage.version] && versionStems[stage.version].length > 0 ? (
                        <div className="space-y-2">
                          {versionStems[stage.version].map((stem, stemIndex) => (
                            <div 
                              key={stemIndex}
                              className="bg-white/5 rounded-md p-3 border border-white/10"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-white">{stem.fileName}</p>
                                  <p className="text-xs text-gray-400">{stem.category}</p>
                                  {stem.metadata?.duration && (
                                    <p className="text-xs text-gray-400">
                                      Duration: {Math.round(stem.metadata.duration)}s
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded transition-colors">
                                    Play
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No stems available for this version</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TrackPageCopy: React.FC<TrackPageCopyProps> = () => {
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

  // 버전별 스템 로드 (개선된 버전 - 특정 스테이지의 스템만 가져오기)
  const loadStemsByVersion = async (version: number) => {
    if (!trackId) return;

    try {
      setStemsLoading(true);
      
      // 먼저 마스터 스템 스트림 조회 시도
      const masterStemsResponse = await streamingService.getMasterStemStreams(trackId, version);
      
      if (masterStemsResponse.data && masterStemsResponse.data.stems) {
        console.log('[DEBUG][TrackPage] Loaded master stems for version:', version);
        setStems(masterStemsResponse.data.stems);
        setSelectedStageVersion(version);
      } else {
        // 마스터 스템이 없으면 버전 스템 조회 시도
        try {
          const versionStems = await versionStemService.getLatestStemsPerCategoryByTrack(trackId, version);
          console.log('[DEBUG][TrackPage] Loaded version stems for version:', version, versionStems);
          
          // 버전 스템 데이터를 StemStreamingInfo 형태로 변환
          const convertedStems: StemStreamingInfo[] = versionStems?.map((stem: any) => ({
            id: stem.id,
            fileName: stem.file_name,
            category: stem.category?.name || 'Unknown',
            tag: stem.key,
            key: stem.key,
            description: '',
            presignedUrl: '',
            metadata: {
              duration: 0,
              fileSize: 0
            },
            uploadedBy: {
              id: stem.user?.id || '',
              username: stem.user?.username || 'Unknown'
            },
            uploadedAt: stem.uploaded_at
          })) || [];
          
          setStems(convertedStems);
          setSelectedStageVersion(version);
        } catch (versionError) {
          console.error('[ERROR][TrackPage] Error loading version stems:', versionError);
          setStems([]);
        }
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
            onSettingsClick={() => console.log('Settings clicked')}
          />

          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* 메인 컨텐츠 Grid 레이아웃 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* 왼쪽 영역 - 트랙 정보 카드 (2/3 width) */}
              <div className="lg:col-span-2 transform transition-all duration-300 hover:scale-[1.02]">
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

              {/* 오른쪽 영역 - 메타정보 카드들 (1/3 width) */}
              <div className="space-y-6">
                <div className="transform transition-all duration-300 hover:scale-[1.02]">
                  <TrackMetaCard track={track} />
                </div>
                <div className="transform transition-all duration-300 hover:scale-[1.02]">
                  <VersionInfoPanel 
                    selectedVersion={selectedStageVersion}
                    selectedStage={getSelectedStage()}
                    totalStems={stems.length}
                  />
                </div>
                <div className="transform transition-all duration-300 hover:scale-[1.02]">
                  <CollaboratorsCard track={track} />
                </div>
              </div>
            </div>

            {/* 스테이지 히스토리 */}
            <div className="transform transition-all duration-300 mb-8">
              <StageHis
                stages={stages}
                onStageSelect={handleStageClick}
                onOpenStageClick={() => setIsOpenStageModalOpen(true)}
                disableStageOpening={isVersion1()}
                isActiveStage={isActiveStage}
              />
            </div>

            {/* 버전 히스토리 타임라인 */}
            {stages.length > 0 && (
              <div className="transform transition-all duration-300">
                <VersionTimeline
                  stages={stages}
                  selectedVersion={selectedStageVersion}
                  onVersionSelect={loadStemsByVersion}
                  stems={stems}
                  trackId={trackId || ''}
                />
              </div>
            )}
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

export default TrackPageCopy;