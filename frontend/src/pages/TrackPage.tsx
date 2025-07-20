import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Track, Stage } from '../types/api';
import {
  TrackHeaderCopy,
  Trackinfocardjjm,
  OpenStageModal,
  StemListModal,
  StageHis,
} from '../components';
import { useAuth } from '../contexts/AuthContext';
import {
  getTrackStages,
  createStage,
  getBackToPreviousStage,
  getStageByTrackIdAndVersion,
} from '../services/stageService';
import { createStageReviewer } from '../services/stageReviewerService';
import { StemStreamingInfo } from '../services/streamingService';
import trackService from '../services/trackService';
import versionStemService from '../services/versionstemService';

interface TrackPagejjmProps {}

// 모던한 로딩 컴포넌트
const ModernLoader: React.FC = () => (
  <div className='flex min-h-screen items-center justify-center bg-black'>
    <div className='relative'>
      <div className='h-16 w-16 animate-spin rounded-full border-4 border-purple-300 border-t-transparent shadow-lg'></div>
      <div className='absolute inset-0 h-16 w-16 animate-ping rounded-full border-4 border-purple-400 opacity-20'></div>
    </div>
  </div>
);

// 에러 상태 컴포넌트
const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className='flex min-h-screen items-center justify-center bg-black'>
    <div className='rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-lg'>
      <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20'>
        <svg
          className='h-8 w-8 text-red-400'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
      </div>
      <h1 className='mb-2 text-2xl font-bold text-white'>{message}</h1>
      <p className='text-gray-400'>Please try again later</p>
    </div>
  </div>
);

// 스템 변경 타입 정의
type StemChangeType = 'new' | 'modified' | 'unchanged';

interface StemWithChanges extends StemStreamingInfo {
  changeType?: StemChangeType;
}

// 버전 타임라인 컴포넌트
const VersionTimeline: React.FC<{
  stages: Stage[];
  selectedVersion: number;
  onVersionSelect: (version: number) => void;
  trackId: string;
}> = ({ stages, selectedVersion, onVersionSelect, trackId }) => {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [versionStems, setVersionStems] = useState<{
    [key: number]: StemWithChanges[];
  }>({});
  const [loadingVersions, setLoadingVersions] = useState<{
    [key: number]: boolean;
  }>({});

  const sortedStages = [...stages].sort((a, b) => b.version - a.version);

  // 스템 변경 타입 확인 함수 - getLatestStemsPerCategoryByTrack API 사용
  const determineChangeType = async (currentVersion: number): Promise<StemWithChanges[]> => {
    try {
      // 현재 버전과 이전 버전의 카테고리별 최신 스템 비교
      const [currentVersionStems, previousVersionStems] = await Promise.all([
        versionStemService.getLatestStemsPerCategoryByTrack(trackId!, currentVersion),
        currentVersion > 1 
          ? versionStemService.getLatestStemsPerCategoryByTrack(trackId!, currentVersion - 1)
          : Promise.resolve([])
      ]);

      console.log('[DEBUG] Current version stems:', currentVersionStems);
      console.log('[DEBUG] Previous version stems:', previousVersionStems);

      return currentVersionStems.map((currentItem: any) => {
        const currentStem = currentItem.stem;
        const category = currentItem.category;

        // 변환된 스템 객체 생성
        const convertedStem: StemWithChanges = {
          id: currentStem.id,
          fileName: currentStem.file_name,
          category: category,
          tag: currentStem.key || '',
          key: currentStem.key || '',
          description: currentStem.description || '',
          presignedUrl: '',
          metadata: {
            duration: 0,
            fileSize: 0,
          },
          uploadedBy: {
            id: currentStem.user?.id || '',
            username: currentStem.user?.username || 'Unknown',
          },
          uploadedAt: currentStem.uploaded_at,
        };

        // 변경 타입 결정
        if (currentVersion === 1) {
          // 첫 번째 버전이면 모든 스템이 새로운 것
          convertedStem.changeType = 'new';
        } else {
          // 이전 버전에서 같은 카테고리의 스템 찾기
          const previousStemInCategory = previousVersionStems.find((prevItem: any) => 
            prevItem.category === category
          );

          if (!previousStemInCategory) {
            // 이전 버전에 해당 카테고리가 없었으면 새로운 것
            convertedStem.changeType = 'new';
          } else if (previousStemInCategory.stem.id !== currentStem.id) {
            // 스템 ID가 다르면 수정된 것
            convertedStem.changeType = 'modified';
          } else {
            // 같은 스템이면 변경되지 않은 것
            convertedStem.changeType = 'unchanged';
          }
        }

        return convertedStem;
      });
    } catch (error) {
      console.error('[ERROR] Failed to determine change types:', error);
      return [];
    }
  };

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

  // 초기 로딩 시 selectedVersion에 해당하는 버전을 자동 확장
  useEffect(() => {
    if (selectedVersion && stages.length > 0 && !expandedVersion) {
      const targetStage = stages.find(
        (stage) => stage.version === selectedVersion
      );
      if (targetStage) {
        console.log(
          '[DEBUG][VersionTimeline] Auto-expanding version based on selectedVersion:',
          selectedVersion
        );
        setExpandedVersion(selectedVersion);

        // 스템 로드
        if (!versionStems[selectedVersion]) {
          loadVersionStems(selectedVersion);
        }
      }
    }
  }, [selectedVersion, stages, expandedVersion, versionStems]);

  const loadVersionStems = async (version: number) => {
    setLoadingVersions((prev) => ({ ...prev, [version]: true }));

    try {
      console.log(
        `[DEBUG][VersionTimeline] Loading version-stems for version: ${version}`
      );

      // 새로운 API를 사용하여 변경 타입과 함께 스템 데이터 로드
      const stemsWithChanges = await determineChangeType(version);

      setVersionStems((prev) => ({
        ...prev,
        [version]: stemsWithChanges,
      }));

      console.log(
        `[DEBUG][VersionTimeline] Successfully loaded ${stemsWithChanges.length} version-stems for version: ${version}`
      );
    } catch (error) {
      console.error(
        `[ERROR][VersionTimeline] Failed to load version-stems for version ${version}:`,
        error
      );
      setVersionStems((prev) => ({
        ...prev,
        [version]: [],
      }));
    } finally {
      setLoadingVersions((prev) => ({ ...prev, [version]: false }));
    }
  };

  return (
    <div className='rounded-lg border border-white/10 bg-white/5 p-6 shadow-md backdrop-blur-lg'>
      <h3 className='mb-6 text-xl font-semibold text-white'>Version History</h3>
      <div className='relative'>
        {/* 타임라인 세로선 */}
        <div className='absolute bottom-0 left-4 top-0 w-0.5 bg-gradient-to-b from-[#893AFF] via-[#B974FF] to-[#F1E9FF]'></div>

        <div className='space-y-6'>
          {sortedStages.map((stage, _index) => (
            <div key={stage.id} className='relative flex items-end'>
              {/* 타임라인 노드 */}
              <div
                className={`relative z-10 h-8 w-8 cursor-pointer rounded-full border-4 transition-all duration-200 ${
                  selectedVersion === stage.version
                    ? 'border-amber-300 bg-amber-400 shadow-lg shadow-amber-400/50'
                    : stage.status === 'active'
                      ? 'border-green-300 bg-green-400 shadow-lg shadow-green-400/50'
                      : 'border-gray-300 bg-gray-400 hover:bg-amber-300'
                }`}
                onClick={() => toggleExpanded(stage.version)}
              >
                <div className='absolute inset-0 rounded-full bg-white/20'></div>
                {stage.status === 'active' && (
                  <div className='absolute inset-1 animate-pulse rounded-full bg-green-400'></div>
                )}
              </div>

              {/* 버전 정보 카드 */}
              <div className='ml-6 flex-1'>
                <div
                  className={`cursor-pointer rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-lg transition-all duration-200 ${
                    selectedVersion === stage.version
                      ? 'ring-2 ring-amber-400'
                      : 'hover:bg-white/15'
                  }`}
                  onClick={() => toggleExpanded(stage.version)}
                >
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-lg font-semibold text-white'>
                        Version {stage.version}
                        {stage.status === 'active' && (
                          <span className='ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'>
                            Active
                          </span>
                        )}
                      </h4>
                      <p className='mt-1 text-xs text-gray-400'>
                        {new Date(stage.created_at).toLocaleDateString(
                          'ko-KR',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                          expandedVersion === stage.version ? 'rotate-180' : ''
                        }`}
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M19 9l-7 7-7-7'
                        />
                      </svg>
                    </div>
                  </div>

                  {/* 스템 리스트 아코디언 */}
                  {expandedVersion === stage.version && (
                    <div className='mt-4 border-t border-white/20 pt-4'>
                      <h5 className='mb-3 text-sm font-medium text-gray-300'>
                        Stems in this version:
                      </h5>
                      {loadingVersions[stage.version] ? (
                        <div className='flex items-center justify-center py-4'>
                          <div className='h-6 w-6 animate-spin rounded-full border-b-2 border-amber-400'></div>
                          <span className='ml-2 text-sm text-gray-400'>
                            Loading stems...
                          </span>
                        </div>
                      ) : versionStems[stage.version] &&
                        versionStems[stage.version].filter(stem => stem.changeType !== 'unchanged').length > 0 ? (
                        <div className='space-y-2'>
                          {versionStems[stage.version]
                            .filter(stem => stem.changeType !== 'unchanged') // unchanged 스템 제외
                            .map((stem, stemIndex) => {
                              // 변경 타입에 따른 스타일 정의
                              const getChangeTypeStyle = (changeType?: StemChangeType) => {
                                switch (changeType) {
                                  case 'new':
                                    return {
                                      border: 'border-green-500/50',
                                      bg: 'bg-green-500/10',
                                      badge: 'bg-green-500 text-white',
                                      icon: '✨',
                                      label: 'NEW'
                                    };
                                  case 'modified':
                                    return {
                                      border: 'border-yellow-500/50',
                                      bg: 'bg-yellow-500/10',
                                      badge: 'bg-yellow-500 text-white',
                                      icon: '🔄',
                                      label: 'MODIFIED'
                                    };
                                  case 'unchanged':
                                  default:
                                    return {
                                      border: 'border-white/10',
                                      bg: 'bg-white/5',
                                      badge: 'bg-gray-500 text-white',
                                      icon: '📄',
                                      label: 'UNCHANGED'
                                    };
                                }
                              };

                              const changeStyle = getChangeTypeStyle(stem.changeType);

                              return (
                                <div
                                  key={stemIndex}
                                  className={`rounded-md border ${changeStyle.border} ${changeStyle.bg} p-3 transition-all duration-200`}
                                >
                                  <div className='flex items-center justify-between'>
                                    <div className='flex-1'>
                                      <div className='flex items-center gap-2 mb-1'>
                                        <p className='text-sm font-medium text-white'>
                                          {stem.fileName}
                                        </p>
                                        {stem.changeType && (
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${changeStyle.badge}`}>
                                            <span>{changeStyle.icon}</span>
                                            {changeStyle.label}
                                          </span>
                                        )}
                                      </div>
                                      <p className='text-xs text-gray-400'>
                                        {stem.category}
                                      </p>
                                      {stem.metadata?.duration && (
                                        <p className='text-xs text-gray-400'>
                                          Duration:{' '}
                                          {Math.round(stem.metadata.duration)}s
                                        </p>
                                      )}
                                      <p className='text-xs text-gray-500 mt-1'>
                                        By: {stem.uploadedBy?.username || 'Unknown'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      ) : (
                        <p className='text-sm italic text-gray-400'>
                          {versionStems[stage.version] && versionStems[stage.version].length > 0 
                            ? 'No new or modified stems in this version' 
                            : 'No stems available for this version'
                          }
                        </p>
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

const TrackPage: React.FC<TrackPagejjmProps> = () => {
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

  // APPROVED 또는 approve 상태 중 가장 높은 버전의 스테이지 로드
  const loadApproveStems = async () => {
    if (!trackId || stages.length === 0) return;

    try {
      setStemsLoading(true);
      console.log(
        '[DEBUG][TrackPage] Loading initial stems for stages:',
        stages
      );

      // APPROVED 또는 approve 상태의 스테이지들 필터링
      const approvedStages = stages.filter(
        (stage) => stage.status === 'APPROVED' || stage.status === 'approve'
      );

      let targetStage: Stage;

      if (approvedStages.length > 0) {
        // APPROVED/approve 상태 중 가장 높은 버전 선택
        targetStage = approvedStages.reduce((prev, current) =>
          current.version > prev.version ? current : prev
        );
        console.log(
          '[DEBUG][TrackPage] Selected highest approved stage:',
          targetStage
        );
      } else {
        // APPROVED/approve 상태가 없으면 active 스테이지 선택
        const activeStage = stages.find((stage) => stage.status === 'active');
        targetStage =
          activeStage ||
          stages.reduce((prev, current) =>
            current.version > prev.version ? current : prev
          );
        console.log(
          '[DEBUG][TrackPage] No approved stages found, selected fallback stage:',
          targetStage
        );
      }

      if (!targetStage || !targetStage.id) {
        console.warn('[WARN][TrackPage] No stages found or stage ID missing');
        setStems([]);
        return;
      }

      console.log(
        '[DEBUG][TrackPage] Loading stems for target stage:',
        targetStage
      );

      // 백엔드의 getVersionStemByStageId 함수로 해당 스테이지의 version-stem만 조회
      const versionStems = await versionStemService.getVersionStemByStageId(
        targetStage.id
      );

      if (versionStems && Array.isArray(versionStems)) {
        // 버전 스템 데이터를 StemStreamingInfo 형태로 변환
        const convertedStems: StemStreamingInfo[] = versionStems.map(
          (stem: any) => ({
            id: stem.id,
            fileName: stem.file_name,
            category: stem.category?.name || 'Unknown',
            tag: stem.key || '',
            key: stem.key || '',
            description: stem.description || '',
            presignedUrl: '', // 실제 재생 시 로딩
            metadata: {
              duration: 0, // 실제 재생 시 로딩
              fileSize: 0,
            },
            uploadedBy: {
              id: stem.user?.id || '',
              username: stem.user?.username || 'Unknown',
            },
            uploadedAt: stem.uploaded_at,
          })
        );

        setStems(convertedStems);
        setSelectedStageVersion(targetStage.version);
        console.log(
          '[DEBUG][TrackPage] Successfully loaded',
          convertedStems.length,
          'initial version-stems for stage ID:',
          targetStage.id
        );
      } else {
        console.warn(
          '[WARN][TrackPage] No version-stems found for stage ID:',
          targetStage.id
        );
        setStems([]);
      }
    } catch (error) {
      console.error(
        '[ERROR][TrackPage] Error loading initial version-stems:',
        error
      );
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

  // 스테이지별 version-stem만 로드 (stageId 기반)
  const loadStemsByVersion = async (version: number) => {
    if (!trackId) return;

    try {
      setStemsLoading(true);
      console.log('[DEBUG][TrackPage] Loading stems for version:', version);

      // 해당 버전의 스테이지 정보 조회
      const stageInfo = await getStageByTrackIdAndVersion(trackId, version);

      if (!stageInfo || !stageInfo.id) {
        console.error(
          '[ERROR][TrackPage] No stage found for version:',
          version
        );
        setStems([]);
        setSelectedStageVersion(version);
        return;
      }

      console.log('[DEBUG][TrackPage] Found stage info:', stageInfo);

      // 백엔드의 getVersionStemByStageId 함수로 해당 스테이지의 version-stem만 조회
      const versionStems = await versionStemService.getVersionStemByStageId(
        stageInfo.id
      );
      console.log(
        '[DEBUG][TrackPage] Loaded version stems for stage ID:',
        stageInfo.id,
        versionStems
      );

      if (versionStems && Array.isArray(versionStems)) {
        // 버전 스템 데이터를 StemStreamingInfo 형태로 변환
        const convertedStems: StemStreamingInfo[] = versionStems.map(
          (stem: any) => ({
            id: stem.id,
            fileName: stem.file_name,
            category: stem.category?.name || 'Unknown',
            tag: stem.key || '',
            key: stem.key || '',
            description: stem.description || '',
            presignedUrl: '', // 실제 재생 시 로딩
            metadata: {
              duration: 0, // 실제 재생 시 로딩
              fileSize: 0,
            },
            uploadedBy: {
              id: stem.user?.id || '',
              username: stem.user?.username || 'Unknown',
            },
            uploadedAt: stem.uploaded_at,
          })
        );

        setStems(convertedStems);
        console.log(
          '[DEBUG][TrackPage] Successfully loaded',
          convertedStems.length,
          'version-stems for stage ID:',
          stageInfo.id
        );
      } else {
        console.warn(
          '[WARN][TrackPage] No version-stems found for stage ID:',
          stageInfo.id
        );
        setStems([]);
      }

      setSelectedStageVersion(version);
    } catch (error) {
      console.error(
        '[ERROR][TrackPage] Error loading version-stems for stage:',
        error
      );
      setStems([]);
      setSelectedStageVersion(version);
    } finally {
      setStemsLoading(false);
    }
  };

  // Event handlers
  const handleBack = () => navigate('/dashboard');

  const handleShowStage = (stageId: string) => {
    navigate(`/stage/${stageId}`);
  };

  const handlePlay = () => {
    console.log('[DEBUG][TrackPage] Playing track:', track?.id);
    // TODO: 트랙 재생 로직 구현
  };

  const handleShowAllStems = () => setIsStemListModalOpen(true);

  const handleRollBack = async () => {
    if (!trackId) return;

    try {
      console.log(
        '[DEBUG][TrackPage] Rolling back to version:',
        selectedStageVersion
      );
      const response = await getBackToPreviousStage(
        trackId,
        selectedStageVersion
      );

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

  const handleOpenStageSubmit = async (
    description: string,
    reviewerIds: string[]
  ) => {
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
          const reviewerPromises = reviewerIds.map((userId) =>
            createStageReviewer({
              stage_id: newStage.id,
              user_id: userId,
            })
          );

          await Promise.all(reviewerPromises);
          console.log(
            '[DEBUG][TrackPage] Stage reviewers created successfully'
          );
        } catch (reviewerError) {
          console.error(
            '[ERROR][TrackPage] Failed to create some stage reviewers:',
            reviewerError
          );
          // Stage는 생성되었으므로 경고만 표시하고 계속 진행
        }
      }

      setStages((prevStages) => [...prevStages, newStage]);
      setIsOpenStageModalOpen(false);

      console.log('[DEBUG][TrackPage] New stage created:', newStage);
    } catch (error) {
      console.error('[ERROR][TrackPage] Failed to create stage:', error);
    }
  };

  // Helper functions
  const getActiveStage = () => {
    const activeStage = stages.find((stage) => stage.status === 'active');
    console.log('[DEBUG][TrackPage] Active stage:', activeStage);
    return activeStage;
  };

  const getSelectedStage = () => {
    return stages.find((stage) => stage.version === selectedStageVersion);
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
    <div className='relative min-h-screen overflow-hidden bg-black'>
      {/* 어두운 오버레이 */}
      <div className='absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/30'></div>
      <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent'></div>

      {/* 메인 컨텐츠 */}
      <div className='relative z-10 overflow-y-auto scrollbar-hide'>
        <div className='backdrop-blur-sm'>
          <TrackHeaderCopy
            onBack={handleBack}
          />

          <div className='px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
            {/* 메인 컨텐츠 Grid 레이아웃 */}
            <div className='transform transition-all duration-300 hover:scale-[1.02]'>
              <Trackinfocardjjm
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
            <div className='mb-8 transform transition-all duration-300'>
              <StageHis
                stages={stages}
                onStageSelect={handleStageClick}
                onOpenStageClick={() => setIsOpenStageModalOpen(true)}
                disableStageOpening={isVersion1()}
                isActiveStage={isActiveStage}
                selectedVersion={selectedStageVersion}
              />
            </div>

            {/* 버전 히스토리 타임라인 */}
            {stages.length > 0 && (
              <div className='transform transition-all duration-300'>
                <VersionTimeline
                  stages={stages}
                  selectedVersion={selectedStageVersion}
                  onVersionSelect={loadStemsByVersion}
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

export default TrackPage;
