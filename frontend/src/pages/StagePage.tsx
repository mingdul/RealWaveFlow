import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Upload} from 'lucide-react';
// import Logo from '../components/Logo';
import UploadModal from '../components/UploadModal';
import trackService from '../services/trackService';
import { getStageDetail } from '../services/stageService';
import { getStageUpstreams } from '../services/upstreamService';
import { getStageReviewers } from '../services/stageReviewerService';
import streamingService from '../services/streamingService';
import { approveDropReviewer, rejectDropReviewer } from '../services/upstreamReviewService';
import { Track, Stage, Upstream, StageReviewer } from '../types/api';
import tapeActive from '../assets/activeTape.png';
import tapeApproved from '../assets/approveTape.png';
import tapeRejected from '../assets/rejectedTape.png';
import TrackHeader from '../components/TrackHeader';
import { useNavigate } from 'react-router-dom';

const StagePage: React.FC = () => {
  const { trackId, stageId } = useParams<{ trackId: string; stageId: string }>();
  const navigate = useNavigate();
  // 상태 관리
  const [stage, setStage] = useState<Stage | null>(null);
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [reviewers, setReviewers] = useState<StageReviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewersLoading, setReviewersLoading] = useState(false);
  const [reviewersError, setReviewersError] = useState<string | null>(null);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [showAllReviewers, setShowAllReviewers] = useState(false);

  // Constants
  const MAX_DISPLAYED_REVIEWERS = 5;

  // 트랙 정보 가져오기
  useEffect(() => {
    if (trackId) {
      trackService.getTrackById(trackId)
        .then((response: any) => {
          if (response.success) {
            setTrack(response.data || null);
          } else {
            console.error("Failed to fetch track details");
          }
        })
        .catch((error: any) => console.error("Error fetching track details:", error));
    }
  }, [trackId]);

  // 리뷰어 정보 가져오기 함수
  const fetchReviewers = async (stageId: string) => {
    setReviewersLoading(true);
    setReviewersError(null);
    try {
      const reviewersResponse = await getStageReviewers(stageId);
      setReviewers(reviewersResponse || []);
    } catch (error) {
      console.error("Error fetching reviewers:", error);
      setReviewersError("Failed to load reviewers");
    } finally {
      setReviewersLoading(false);
    }
  };

  // 스테이지 정보 가져오기
  useEffect(() => {
    const fetchStageData = async () => {
      if (!stageId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // 스테이지 상세 정보 가져오기
        const stageResponse = await getStageDetail(stageId);
        setStage(stageResponse.data);

        // 업스트림 목록 가져오기
        const upstreamsResponse = await getStageUpstreams(stageId);
        setUpstreams(upstreamsResponse || []);

        // 리뷰어 목록 가져오기
        await fetchReviewers(stageId);

      } catch (error) {
        console.error("Error fetching stage data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStageData();
  }, [stageId]);

  const handleUploadComplete = () => {
    // 업로드 완료 후 업스트림 목록 새로고침
    if (stageId) {
      getStageUpstreams(stageId)
        .then(setUpstreams)
        .catch(error => console.error("Error refreshing upstreams:", error));
    }
  };

  interface StemSetCardProps {
    upstream: Upstream;
    isPlaying: boolean;
    seek: number;
    onPlayToggle: () => void;
    onSeek: (value: number) => void;
    onDetail: () => void;
    onApprove: () => void;
    onReject: () => void;
  }

  const StemSetCard: React.FC<StemSetCardProps> = ({
    upstream, isPlaying, seek, onPlayToggle, onSeek, onDetail, onApprove, onReject
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    const status = upstream.status?.toUpperCase() as 'ACTIVE' | 'REJECTED' | 'APPROVED';
    
    console.log('[DEBUG] Upstream status:', upstream.status, 'Normalized:', status);
    
    const statusColor = status === 'ACTIVE'
      ? 'bg-[#05d182] text-black'
      : status === 'REJECTED'
        ? 'bg-red-500 text-white'
        : 'bg-[#9d4edd] text-white';

    const tapeImg = status === 'APPROVED' ? tapeApproved : status === 'REJECTED' ? tapeRejected : tapeActive;

    return (
      <div
        className="relative w-[350px] h-[250px] p-4 box-border rounded-xl flex flex-col items-center justify-end overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute right-4 top-4 z-30">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>{status}</span>
        </div>
        
        {/* 생성 시간 표시 */}
        <div className="absolute left-4 top-4 z-30">
          <span className="text-white text-[10px] font-medium">
            {upstream.created_at ? new Date(upstream.created_at).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }) : ''}
          </span>
        </div>

        <img
          src={tapeImg}
          alt={`Stem Set ${upstream.id}`}
          className={`absolute inset-0 w-full h-full object-contain scale-110`} 
        />

        <div className="absolute top-[67px] left-0 w-full text-center text-xl font-bold text-black drop-shadow z-20">
          {upstream.title || `AWSOME MIX #${upstream.id}`}
        </div>

        <div
          className={`absolute left-0 top-0 w-full px-6 py-4 flex items-start justify-center z-30 transition-opacity duration-300 ease-in-out
            ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{
            background: 'rgba(30,30,30,0.85)',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            minHeight: 80,
          }}
        >
          <span className="text-white text-sm text-center leading-relaxed line-clamp-2 break-words overflow-hidden">
            {upstream.description || "No feedback yet."}
          </span>
        </div>

        <div className={`w-full flex flex-col items-center z-40 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'} transition-opacity duration-300 ease-in-out`}>
          <input
            type="range"
            min={0}
            max={100}
            value={seek}
            onChange={e => onSeek(Number(e.target.value))}
            onClick={e => e.stopPropagation()}
            className="w-3/4 mb-2 accent-purple-700"
          />
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={(e) => { e.stopPropagation(); onPlayToggle(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-700 text-white shadow-lg hover:bg-purple-800 border-2 border-white"
              aria-label={isPlaying ? '정지' : '재생'}
            >
              {isPlaying ? (
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDetail(); }}
              className="px-4 py-2 rounded-full bg-yellow-300 text-black font-semibold shadow hover:bg-yellow-400 border-2 border-white"
            >
              Detail
            </button>
            {status === 'ACTIVE' && (
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onApprove(); }}
                  className="px-3 py-1 rounded-full bg-green-600 text-white text-xs font-semibold shadow hover:bg-green-700 border border-white"
                >
                  Approve
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onReject(); }}
                  className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-semibold shadow hover:bg-red-700 border border-white"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
// 11
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [seekValues, setSeekValues] = useState<number[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // upstreams가 변경될 때 seekValues 배열도 업데이트
  useEffect(() => {
    setSeekValues((upstreams || []).map(() => 0));
  }, [upstreams]);

  // 오디오 URL이 설정되면 자동 재생
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Failed to play audio:', error);
        setPlayingIndex(null);
        setAudioUrl(null);
      });
    }
  }, [audioUrl]);

  const handlePlayToggle = async (idx: number, upstream: Upstream) => {
    if (playingIndex === idx) {
      // 현재 재생 중인 경우 정지
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingIndex(null);
      setAudioUrl(null);
    } else {
      // 다른 업스트림 재생 시작
      if (playingIndex !== null && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      try {
        // upstream의 guide_path가 있는지 확인
        if (upstream.guide_path && track) {
          const response = await streamingService.getGuidePresignedUrlByStageId(stageId || '');
          if (response.success && response.data) {
            setAudioUrl(response.data.presignedUrl);
            setPlayingIndex(idx);
          } else {
            console.error('Failed to get guide presigned URL:', response.message);
          }
        } else {
          console.log('No guide path available for this upstream');
        }
      } catch (error) {
        console.error('Error playing guide:', error);
      }
    }
  };
  
  const handleSeek = (idx: number, value: number) => {
    setSeekValues(prev => prev.map((v, i) => (i === idx ? value : v)));
  };
  
  const handleDetail = (upstream: Upstream) => {
    // Review Page로 이동 (stageId를 쿼리 파라미터로 함께 전달)
    navigate(`/review/${upstream.id}?stageId=${stageId}`);
  };

  const handleApprove = async (upstream: Upstream) => {
    try {
      if (!stageId) {
        console.error('Stage ID is required');
        return;
      }
      
      const response = await approveDropReviewer(stageId, upstream.id);
      if (response.success) {
        console.log('Upstream approved successfully');
        // upstreams 목록 새로고침
        handleUploadComplete();
      } else {
        console.error('Failed to approve upstream:', response.message);
      }
    } catch (error) {
      console.error('Error approving upstream:', error);
    }
  };

  const handleReject = async (upstream: Upstream) => {
    try {
      if (!stageId) {
        console.error('Stage ID is required');
        return;
      }
      
      const response = await rejectDropReviewer(stageId, upstream.id);
      if (response.success) {
        console.log('Upstream rejected successfully');
        // upstreams 목록 새로고침
        handleUploadComplete();
      } else {
        console.error('Failed to reject upstream:', response.message);
      }
    } catch (error) {
      console.error('Error rejecting upstream:', error);
    }
  };

  // 스테이지가 닫혀있는지 확인
  const isStageClosed = stage?.status === 'close' || stage?.status === 'closed';

  if (loading) {
    return (
      <div className="bg-[#2a2a2a] min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="bg-[#2a2a2a] min-h-screen flex justify-center items-center">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-300">Stage not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">

      
      <TrackHeader
      onBack={() => {
        const targetTrackId = trackId || stage?.track?.id;
        if (targetTrackId) {
          navigate(`/track/${targetTrackId}`);
        } else {
          navigate('/dashboard');
        }
      }}/>
      
      <main className='px-8 pb-8'>
        <div className='mb-8'>
          <h2 className='mb-4 text-3xl font-bold text-white'>{stage.title} - V{stage.version}</h2>
          <div className='mb-6 rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 p-6 shadow-lg border border-gray-600'>
            <div className='flex items-start gap-4'>
              <div className='flex-shrink-0'>
                <div className='w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center'>
                  <svg className='w-6 h-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  </svg>
                </div>
              </div>
              <div className='flex-1'>
                <h4 className='text-lg font-semibold text-white mb-2'>Stage Description</h4>
                <p className='text-gray-300 leading-relaxed'>{stage.description || 'No description provided for this stage.'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className='mb-8'>
          <div className='rounded-xl bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 shadow-lg border border-purple-500/30'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div className='flex-shrink-0'>
                  <div className='w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center'>
                    <svg className='w-6 h-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
                    </svg>
                  </div>
                </div>
                <div>
                  <h4 className='text-lg font-semibold text-white mb-1'>Stage Reviewers</h4>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                {/* Refresh Button */}
                <button
                  onClick={() => stageId && fetchReviewers(stageId)}
                  disabled={reviewersLoading}
                  className='p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors duration-200'
                  title="Refresh Reviewers"
                >
                  <svg 
                    className={`w-4 h-4 ${reviewersLoading ? 'animate-spin' : ''}`} 
                    fill='none' 
                    stroke='currentColor' 
                    viewBox='0 0 24 24'
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                  </svg>
                </button>
                
                <div className='flex -space-x-3'>
                  {reviewersLoading ? (
                    <div className="h-12 w-12 rounded-full border-3 border-purple-500 bg-gray-700 flex items-center justify-center animate-pulse">
                      <svg className='w-5 h-5 text-purple-400 animate-spin' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                      </svg>
                    </div>
                  ) : reviewersError ? (
                    <div className="h-12 w-12 rounded-full border-3 border-red-500 bg-red-900/50 flex items-center justify-center">
                      <svg className='w-5 h-5 text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z' />
                      </svg>
                    </div>
                  ) : reviewers && reviewers.length > 0 ? (
                    <>
                      {(showAllReviewers ? reviewers : reviewers.slice(0, MAX_DISPLAYED_REVIEWERS)).map((reviewer, _index) => (
                        <div key={reviewer.id} className='relative group'>
                          <div className='h-12 w-12 rounded-full border-3 border-white bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg hover:scale-110 transition-transform duration-200'>
                            {reviewer.user?.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className='absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10'>
                            {reviewer.user?.username || 'Unknown User'}
                          </div>
                </div>
              ))}
                      {reviewers.length > MAX_DISPLAYED_REVIEWERS && (
                        <button
                          onClick={() => setShowAllReviewers(!showAllReviewers)}
                          className='h-12 w-12 rounded-full border-3 border-white bg-gray-600 hover:bg-gray-500 flex items-center justify-center text-white font-bold text-sm shadow-lg hover:scale-110 transition-all duration-200'
                          title={showAllReviewers ? 'Show Less' : `Show ${reviewers.length - MAX_DISPLAYED_REVIEWERS} more`}
                        >
                          {showAllReviewers ? (
                            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                            </svg>
                          ) : (
                            <span className='text-xs'>+{reviewers.length - MAX_DISPLAYED_REVIEWERS}</span>
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className='flex gap-2'>
                      <div className='h-12 w-12 rounded-full border-3 border-dashed border-gray-500 bg-gray-700 flex items-center justify-center'>
                        <svg className='w-5 h-5 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
                        </svg>
                      </div>
                      <div className='h-12 w-12 rounded-full border-3 border-dashed border-gray-500 bg-gray-700 flex items-center justify-center'>
                        <svg className='w-5 h-5 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='mb-8'>
          <div className='mb-6 flex items-center gap-4'>
            <h3 className='text-xl font-medium text-white'>STEM SET LIST</h3>
            {!isStageClosed ? (
              <button
                className='flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-500'
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload size={16} />
                <span className='text-sm font-medium'>UPLOAD</span>
              </button>
            ) : (
              <button
                className='flex items-center gap-2 rounded-md bg-gray-500 px-4 py-2 text-gray-300 cursor-not-allowed'
                disabled
              >
                <Upload size={16} />
                <span className='text-sm font-medium'>UPLOAD (스테이지가 닫혀있습니다)</span>
              </button>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="text-white">Loading stem sets...</div>
            </div>
          ) : (!upstreams || upstreams.length === 0) ? (
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="text-white">No stem sets available</div>
            </div>
          ) : (
            upstreams.map((upstream, idx) => (
              <StemSetCard
                key={upstream.id}
                upstream={upstream}
                isPlaying={playingIndex === idx}
                seek={seekValues[idx]}
                onPlayToggle={() => handlePlayToggle(idx, upstream)}
                onSeek={value => handleSeek(idx, value)}
                onDetail={() => handleDetail(upstream)}
                onApprove={() => handleApprove(upstream)}
                onReject={() => handleReject(upstream)}
              />
            ))
          )}
        </div>
      </main>

      {stage.track && (
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          projectId={stage.track.id}
          projectName={track ? track.title : ""}
          stageId={stageId}
          stageVersion={stage.version}
          onComplete={handleUploadComplete} 
        />
      )}
      
      {/* 오디오 엘리먼트 */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => {
            setPlayingIndex(null);
            setAudioUrl(null);
          }}
          onError={(e) => {
            console.error('Audio playback error:', e);
            setPlayingIndex(null);
            setAudioUrl(null);
          }}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

export default StagePage;