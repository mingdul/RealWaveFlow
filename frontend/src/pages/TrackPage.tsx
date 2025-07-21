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
import streamingService from '../services/streamingService';
import { decodeFilename } from '../utils/filenameUtils';

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
  previousFileName?: string; // Modify 상태일 때 이전 파일명
}

// 버전 타임라인 컴포넌트
const VersionTimeline: React.FC<{
  stages: Stage[];
  selectedVersion: number | null;
  onVersionSelect: (version: number) => void;
  trackId: string;
  navigate: (path: string) => void;
}> = ({ stages, selectedVersion, onVersionSelect, trackId, navigate }) => {
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

      // version-stem이 없으면 빈 배열 반환
      if (!currentVersionStems || currentVersionStems.length === 0) {
        console.log('[DEBUG] No version-stems found for version:', currentVersion);
        return [];
      }

      return currentVersionStems.map((currentItem: any) => {
        const currentStem = currentItem.stem;
        
        // stem.category에서 instrument 정보 가져오기
        const categoryInstrument = currentStem.category?.instrument || currentStem.category?.name || currentItem.category;

        // 변환된 스템 객체 생성
        const convertedStem: StemWithChanges = {
          id: currentStem.id,
          fileName: currentStem.file_name,
          category: categoryInstrument, // instrument 값 사용
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
            prevItem.category === currentItem.category
          );

          if (!previousStemInCategory) {
            // 이전 버전에 해당 카테고리가 없었으면 새로운 것
            convertedStem.changeType = 'new';
          } else if (previousStemInCategory.stem.id !== currentStem.id) {
            // 스템 ID가 다르면 수정된 것
            convertedStem.changeType = 'modified';
            convertedStem.previousFileName = previousStemInCategory.stem.file_name; // 이전 파일명 저장
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

  // VersionTimeline은 초기에 아무것도 선택되지 않음 (자동 확장 제거)
  // selectedVersion이 변경될 때만 확장
  useEffect(() => {
    if (selectedVersion !== null && stages.length > 0) {
      const targetStage = stages.find(
        (stage) => stage.version === selectedVersion
      );
      if (targetStage) {
        console.log(
          '[DEBUG][VersionTimeline] Expanding version based on selection:',
          selectedVersion
        );
        setExpandedVersion(selectedVersion);

        // 스템 로드
        if (!versionStems[selectedVersion]) {
          loadVersionStems(selectedVersion);
        }
      }
    }
  }, [selectedVersion, stages, versionStems]);

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
                  selectedVersion !== null && selectedVersion === stage.version
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
                    selectedVersion !== null && selectedVersion === stage.version
                      ? 'ring-2 ring-amber-400'
                      : 'hover:bg-white/15'
                  }`}
                  onClick={() => toggleExpanded(stage.version)}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex-1'>
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
                    <div className='flex items-center space-x-3'>
                      {/* Stage 페이지로 이동하는 파랑색 버튼 - active 상태가 아닐 때만 표시 */}
                      {stage.status !== 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/stage/${stage.id}`);
                          }}
                          className='inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:scale-105 hover:shadow-blue-500/25'
                        >
                          <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
                          </svg>
                          History
                        </button>
                      )}
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
                        <div className='space-y-3'>
                          {versionStems[stage.version]
                            .filter(stem => stem.changeType !== 'unchanged') // unchanged 스템 제외
                            .map((stem, stemIndex) => {
                              // 변경 타입에 따른 스타일 정의
                              const getChangeTypeStyle = (changeType?: StemChangeType) => {
                                switch (changeType) {
                                  case 'new':
                                    return {
                                      border: 'border-green-400 border-2',
                                      bg: 'bg-gradient-to-r from-green-500/20 to-green-600/10',
                                      badge: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg',
                                      icon: '✨',
                                      label: 'NEW',
                                      glow: 'shadow-green-500/25'
                                    };
                                  case 'modified':
                                    return {
                                      border: 'border-yellow-400 border-2',
                                      bg: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/10',
                                      badge: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg',
                                      icon: '🔄',
                                      label: 'MODIFIED',
                                      glow: 'shadow-yellow-500/25'
                                    };
                                  case 'unchanged':
                                  default:
                                    return {
                                      border: 'border-white/10',
                                      bg: 'bg-white/5',
                                      badge: 'bg-gray-500 text-white',
                                      icon: '📄',
                                      label: 'UNCHANGED',
                                      glow: ''
                                    };
                                }
                              };

                              const changeStyle = getChangeTypeStyle(stem.changeType);

                              return (
                                <div
                                  key={stemIndex}
                                  className={`rounded-xl border ${changeStyle.border} ${changeStyle.bg} p-4 transition-all duration-300 hover:scale-[1.02] ${changeStyle.glow} shadow-xl`}
                                >
                                  <div className='flex items-start gap-4'>
                                    {/* 스템 정보 */}
                                    <div className='flex-1 min-w-0'>
                                      {/* 파일명과 라벨 */}
                                      <div className='flex items-center gap-3 mb-2'>
                                        <div className='flex-1'>
                                          <h4 className='text-base font-semibold text-white truncate'>
                                            {decodeFilename(stem.fileName)}
                                          </h4>
                                          {/* Modify 상태일 때 이전 파일명 표시 */}
                                          {stem.changeType === 'modified' && stem.previousFileName && (
                                            <p className='text-sm text-gray-500 mt-1'>
                                              <span className='text-gray-300'>{decodeFilename(stem.previousFileName)}</span>
                                              <span className='mx-2'>→</span>
                                              <span className='text-yellow-400'>{decodeFilename(stem.fileName)}</span>
                                            </p>
                                          )}
                                        </div>
                                        {stem.changeType && (
                                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold tracking-wide ${changeStyle.badge} transform hover:scale-105 transition-transform`}>
                                            <span className='text-lg'>{changeStyle.icon}</span>
                                            {changeStyle.label}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* 카테고리 */}
                                      <div className='flex items-center gap-2 mb-1'>
                                        <span className='text-xs font-medium text-gray-300 bg-white/10 px-2 py-1 rounded-md'>
                                          🎵 {stem.category}
                                        </span>
                                      </div>
                                      
                                      {/* 업로더 정보 */}
                                      <div className='flex items-center gap-2 text-xs text-gray-400'>
                                        <span className='flex items-center gap-1'>
                                          <span>👤</span>
                                          <span className='font-medium text-gray-300'>
                                            {stem.uploadedBy?.username || 'Unknown'}
                                          </span>
                                        </span>
                                        {stem.metadata?.duration && (
                                          <span className='flex items-center gap-1 ml-3'>
                                            <span>⏱️</span>
                                            <span>{Math.round(stem.metadata.duration)}s</span>
                                          </span>
                                        )}
                                      </div>
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
                            ? 'No new or modified version-stems in this version' 
                            : 'No version-stems available for this version'
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
  const [selectedStageVersion, setSelectedStageVersion] = useState<number>(1); // StageHistory용
  const [selectedVersionTimeline, setSelectedVersionTimeline] = useState<number | null>(null); // VersionTimeline용 (독립적)
  const [error, setError] = useState<string | null>(null);

  // StemListModal 전용 상태 (Stage별 stems 관리)
  const [modalStems, setModalStems] = useState<StemStreamingInfo[]>([]);
  const [modalStageId, setModalStageId] = useState<string | null>(null);
  const [modalVersionNumber, setModalVersionNumber] = useState<string>('');

  // 전역 오디오 관리 상태
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [currentPlayingType, setCurrentPlayingType] = useState<'track' | 'stage' | null>(null);

  // 전역 오디오 관리 함수들
  const stopCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      console.log('[DEBUG][TrackPage] Stopped current audio:', currentPlayingId);
    }
    setCurrentAudio(null);
    setCurrentPlayingId(null);
    setCurrentPlayingType(null);
  };

  const playAudio = async (audioUrl: string, audioId: string, audioType: 'track' | 'stage') => {
    console.log('[DEBUG][TrackPage] playAudio called:', { audioId, audioType, currentPlayingId });
    
    // 동일한 오디오를 다시 클릭한 경우 토글 (중지)
    if (currentPlayingId === audioId && currentPlayingType === audioType) {
      console.log('[DEBUG][TrackPage] Same audio clicked, stopping...');
      stopCurrentAudio();
      return false; // 재생 중지됨을 알림
    }

    // 이전 오디오 중지
    stopCurrentAudio();

    try {
      // 새 오디오 생성 및 재생
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => {
        console.log('[DEBUG][TrackPage] Audio started playing:', audioId);
      };
      
      audio.onended = () => {
        console.log('[DEBUG][TrackPage] Audio playback ended:', audioId);
        setCurrentAudio(null);
        setCurrentPlayingId(null);
        setCurrentPlayingType(null);
      };
      
      audio.onerror = (error) => {
        console.error('[ERROR][TrackPage] Audio playback error:', error);
        setCurrentAudio(null);
        setCurrentPlayingId(null);
        setCurrentPlayingType(null);
      };

      // 상태 업데이트
      setCurrentAudio(audio);
      setCurrentPlayingId(audioId);
      setCurrentPlayingType(audioType);

      // 재생 시작
      await audio.play();
      console.log('[DEBUG][TrackPage] Successfully started new audio:', audioId);
      return true; // 재생 시작됨을 알림
      
    } catch (error) {
      console.error('[ERROR][TrackPage] Failed to play audio:', error);
      setCurrentAudio(null);
      setCurrentPlayingId(null);
      setCurrentPlayingType(null);
      return false;
    }
  };

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

  // 스테이지별 version-stem만 로드 (stageId 기반) - StageHistory용
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

  // VersionTimeline용 독립적인 버전 선택 함수
  const handleVersionTimelineSelect = (version: number) => {
    setSelectedVersionTimeline(version);
    console.log('[DEBUG][TrackPage] VersionTimeline selected version:', version);
  };

  // Event handlers
  const handleBack = () => navigate('/dashboard');

  const handleShowStage = (stageId: string) => {
    navigate(`/stage/${stageId}`);
  };

  const handlePlay = async () => {
    console.log('[DEBUG][TrackPage] Playing track:', track?.id);
    
    if (!trackId) {
      console.error('[ERROR][TrackPage] No trackId available for playback');
      return;
    }

    try {
      // lastApprovedStageId 가져오기
      const lastApprovedStage = getLastApprovedStage();
      let stageId = lastApprovedStage?.id;
      
      // lastApprovedStageId가 없으면 최신 스테이지 사용
      if (!stageId) {
        console.log('[DEBUG][TrackPage] No approved stage found, fetching latest stage...');
        const { getLatestStage } = await import('../services/stageService');
        const latestStage = await getLatestStage(trackId);
        if (latestStage) {
          stageId = latestStage.id;
          console.log('[DEBUG][TrackPage] Using latest stage:', stageId);
        } else {
          console.warn('[WARN][TrackPage] No stages found for this track');
          return;
        }
      }

      if (!stageId) {
        console.warn('[WARN][TrackPage] No stage ID available for playback');
        return;
      }

      // presigned URL 요청
      const response = await streamingService.getGuidePresignedUrlByStageId(stageId);
      console.log('[DEBUG][TrackPage] Track guide API response:', response);

      if (response.success && response.data) {
        // 전역 오디오 관리 시스템 사용
        await playAudio(response.data.presignedUrl, `track-${trackId}`, 'track');
      } else {
        console.error('[ERROR][TrackPage] Failed to fetch track guide:', response.message);
      }
    } catch (error) {
      console.error('[ERROR][TrackPage] Error playing track guide:', error);
    }
  };

  // Stage별 stems 로딩 로직 (모달 열지 않음)
  const loadStageStems = async (stageId: string): Promise<boolean> => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) {
      console.error('[ERROR][TrackPage] Stage not found:', stageId);
      return false;
    }

    console.log('[DEBUG][TrackPage] Loading stems for stage - Version:', stage.version, 'Status:', stage.status);

    // Active 스테이지는 version-stem이 없으므로 차단
    if (stage.status === 'active') {
      console.warn('[WARN][TrackPage] Active stage has no version-stems');
      alert('Active stage는 아직 version-stem이 없습니다. 승인 후 확인 가능합니다.');
      return false;
    }

    try {
      setStemsLoading(true);
      
      // 해당 스테이지의 version-stem만 조회
      const versionStems = await versionStemService.getVersionStemByStageId(stageId);
      
      if (versionStems && Array.isArray(versionStems)) {
        // 버전 스템 데이터를 StemStreamingInfo 형태로 변환
        const convertedStems: StemStreamingInfo[] = versionStems.map(
          (stem: any) => ({
            id: stem.id,
            fileName: stem.file_name,
            category: stem.category?.name || stem.category?.instrument || 'Unknown',
            tag: stem.key || '',
            key: stem.key || '',
            description: stem.description || '',
            presignedUrl: '',
            metadata: { duration: 0, fileSize: 0 },
            uploadedBy: {
              id: stem.user?.id || '',
              username: stem.user?.username || 'Unknown',
            },
            uploadedAt: stem.uploaded_at,
          })
        );

        console.log('[DEBUG][TrackPage] 🎯 Successfully loaded', convertedStems.length, 'stage-specific stems');
        
        // Modal 전용 상태 설정
        setModalStems(convertedStems);
        setModalStageId(stageId);
        setModalVersionNumber(stage.version.toString());
        return true;
      } else {
        console.warn('[WARN][TrackPage] No version-stems found for stageId:', stageId);
        setModalStems([]);
        setModalStageId(stageId);
        setModalVersionNumber(stage.version.toString());
        return true;
      }
    } catch (error) {
      console.error('[ERROR][TrackPage] Error loading stage-specific stems:', error);
      return false;
    } finally {
      setStemsLoading(false);
    }
  };

  const handleShowAllStems = async () => {
    console.log('[DEBUG][TrackPage] === TrackInfo Show All Stems ===');
    
    const lastApprovedStage = getLastApprovedStage();
    
    if (lastApprovedStage) {
      console.log('[DEBUG][TrackPage] Loading stems for last approved stage:', lastApprovedStage);
      const success = await loadStageStems(lastApprovedStage.id);
      if (success) {
        setIsStemListModalOpen(true);
      }
    } else {
      console.warn('[DEBUG][TrackPage] No approved stage found, using current stems');
      // 승인된 스테이지가 없으면 현재 stems 사용
      setModalStems(stems);
      setModalStageId(null);
      setModalVersionNumber(selectedStageVersion.toString());
      setIsStemListModalOpen(true);
    }
  };

  const handleStageShowAllStems = async (stageId: string) => {
    console.log('[DEBUG][TrackPage] === StageHis Show All Stems ===');
    console.log('[DEBUG][TrackPage] Target stageId:', stageId);
    
    const success = await loadStageStems(stageId);
    if (success) {
      setIsStemListModalOpen(true);
    }
  };

  // Stage 전용 함수들
  const handleStagePlay = async (stageId: string) => {
    console.log('[DEBUG][TrackPage] Playing stage audio:', stageId);
    
    try {
      // 스테이지 가이드 재생을 위한 presigned URL 요청
      const response = await streamingService.getGuidePresignedUrlByStageId(stageId);
      
      console.log('[DEBUG][TrackPage] Stage guide API response:', response);
      
      if (response.success && response.data) {
        // 전역 오디오 관리 시스템 사용
        await playAudio(response.data.presignedUrl, `stage-${stageId}`, 'stage');
      } else {
        console.error('[ERROR][TrackPage] Failed to fetch stage guide:', response.message);
      }
    } catch (error) {
      console.error('[ERROR][TrackPage] Error playing stage guide:', error);
    }
  };



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

  const getLastApprovedStage = () => {
    // APPROVED 또는 approve 상태의 스테이지들 필터링
    const approvedStages = stages.filter(
      (stage) => stage.status === 'APPROVED' || stage.status === 'approve'
    );

    if (approvedStages.length > 0) {
      // APPROVED/approve 상태 중 가장 높은 버전 선택
      const lastApprovedStage = approvedStages.reduce((prev, current) =>
        current.version > prev.version ? current : prev
      );
      console.log('[DEBUG][TrackPage] Last approved stage:', lastApprovedStage);
      return lastApprovedStage;
    }

    console.log('[DEBUG][TrackPage] No approved stages found');
    return null;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <TrackHeaderCopy
        onBack={handleBack}
      />

      <main className='relative px-8 pb-8 pt-6 max-w-[1280px] mx-auto'>
        {/* 메인 컨텐츠 Grid 레이아웃 */}
        <div className='mb-8 transform transition-all duration-300'>
          <Trackinfocardjjm
            track={track}
            stems={stems}
            stemsLoading={stemsLoading}
            onPlay={handlePlay}
            versionNumber={selectedStageVersion.toString()}
            onShowAllStems={handleShowAllStems}
            onRollBack={handleRollBack}
            stageId={getLastApprovedStage()?.id}
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
            onPlay={handleStagePlay}
            onShowAllStems={handleStageShowAllStems}
          />
        </div>

        {/* 버전 히스토리 타임라인 */}
        {stages.length > 0 && (
          <div className='transform transition-all duration-300'>
            <VersionTimeline
              stages={stages}
              selectedVersion={selectedVersionTimeline}
              onVersionSelect={handleVersionTimelineSelect}
              trackId={trackId || ''}
              navigate={navigate}
            />
          </div>
        )}
      </main>

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
          stems={modalStems}
          versionNumber={modalVersionNumber}
          loading={stemsLoading}
          onRollBack={handleRollBack}
          onShowStage={handleShowStage}
          stageId={modalStageId || getLastApprovedStage()?.id || getSelectedStage()?.id}
        />

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default TrackPage;
