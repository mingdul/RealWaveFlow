import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, Users, Music, Clock, Award, Eye, CheckCircle, XCircle } from 'lucide-react';
// import Logo from '../components/Logo';
import UploadModal from '../components/UploadModal';
import trackService from '../services/trackService';
import { getStageDetail } from '../services/stageService';
import { getStageUpstreams } from '../services/upstreamService';
import { getStageReviewers } from '../services/stageReviewerService';
import { Track, Stage, Upstream, StageReviewer } from '../types/api';
import tapeActive from '../assets/activeTape.png';
import tapeApproved from '../assets/approveTape.png';
import tapeRejected from '../assets/rejectedTape.png';
import TrackHeader from '../components/TrackHeader';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

const StagePage: React.FC = () => {
  const { trackId, stageId } = useParams<{ trackId: string; stageId: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();
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

  const handleDetail = (upstream: Upstream) => {
    try {
      console.log('🔍 Navigating to review page:', { upstreamId: upstream.id, stageId });
      // Review Page로 이동 (stageId를 쿼리 파라미터로 함께 전달)
      navigate(`/review/${upstream.id}?stageId=${stageId}`);
    } catch (error: any) {
      console.error('❌ Error navigating to review page:', error);
      showError('리뷰 페이지로 이동 중 오류가 발생했습니다.');
    }
  };

  interface StemSetCardProps {
    upstream: Upstream;
    onDetail: () => void;
  }

  const StemSetCard: React.FC<StemSetCardProps> = ({
    upstream, onDetail
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    const status = upstream.status?.toUpperCase() as 'ACTIVE' | 'REJECTED' | 'APPROVED';
    
    console.log('[DEBUG] Upstream status:', upstream.status, 'Normalized:', status);
    
    const statusConfig = {
      ACTIVE: {
        color: 'bg-gradient-to-r from-emerald-500 to-green-500',
        textColor: 'text-white',
        icon: <div className="w-2 h-2 bg-white rounded-full animate-pulse" />,
        border: 'border-emerald-400'
      },
      REJECTED: {
        color: 'bg-gradient-to-r from-red-500 to-red-600',
        textColor: 'text-white',
        icon: <XCircle className="w-4 h-4" />,
        border: 'border-red-400'
      },
      APPROVED: {
        color: 'bg-gradient-to-r from-purple-500 to-indigo-600',
        textColor: 'text-white',
        icon: <CheckCircle className="w-4 h-4" />,
        border: 'border-purple-400'
      }
    };

    const config = statusConfig[status] || statusConfig.ACTIVE;
    const tapeImg = status === 'APPROVED' ? tapeApproved : status === 'REJECTED' ? tapeRejected : tapeActive;

    // Detail 버튼 클릭 핸들러
    const handleDetailClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔍 Detail button clicked!', { upstreamId: upstream.id });
      onDetail();
    };

    return (
      <div
        className="group relative w-full max-w-[380px] h-[280px] rounded-2xl overflow-hidden transition-all duration-500 ease-out transform hover:scale-[1.02] hover:-translate-y-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Status Badge */}
        <div className="absolute top-4 right-4 z-30">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.color} ${config.textColor} text-xs font-semibold shadow-lg border ${config.border} backdrop-blur-sm`}>
            {config.icon}
            <span className="font-medium">{status}</span>
          </div>
        </div>
        
        {/* Creation Time */}
        <div className="absolute top-4 left-4 z-30">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-gray-600/50">
            <Clock className="w-3 h-3 text-gray-300" />
            <span className="text-gray-300 text-xs font-medium">
              {upstream.created_at ? new Date(upstream.created_at).toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }) : ''}
            </span>
          </div>
        </div>

        {/* Tape Image */}
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ pointerEvents: 'none' }}>
          <img
            src={tapeImg}
            alt={`Stem Set ${upstream.id}`}
            className={`w-full h-full object-contain transition-transform duration-700 ${isHovered ? 'scale-110 rotate-2' : 'scale-100'}`}
          />
        </div>

        {/* Title Overlay - 항상 표시 */}
        <div className="absolute top-[70px] left-0 w-full text-center z-20">
          <div className="bg-gradient-to-r from-transparent via-black/60 to-transparent py-2">
            <h3 className="text-xl font-bold text-white drop-shadow-lg px-4">
              {upstream.title || `AWESOME MIX #${upstream.id}`}
            </h3>
          </div>
        </div>

        {/* Hover Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-all duration-500 ease-out z-40
            ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          style={{ pointerEvents: isHovered ? 'auto' : 'none' }}
        >
          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-6">
            {/* Description */}
            <div className="text-center">
              <p className="text-gray-200 text-sm leading-relaxed line-clamp-2">
                {upstream.description || "No description available."}
              </p>
            </div>

            {/* Detail Button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleDetailClick}
                onMouseDown={e => e.stopPropagation()}
                onMouseUp={e => e.stopPropagation()}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold shadow-lg hover:from-yellow-400 hover:to-orange-400 border border-yellow-300/50 transition-all duration-200 transform hover:scale-105 z-50"
                style={{ pointerEvents: 'auto' }}
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm">Detail</span>
              </button>
            </div>
          </div>
        </div>

        {/* Glow Effect */}
        <div className={`absolute inset-0 rounded-2xl transition-all duration-500 z-5 ${isHovered ? 'shadow-[0_0_30px_rgba(147,51,234,0.3)]' : ''}`} style={{ pointerEvents: 'none' }} />
      </div>
    );
  };

  // 스테이지가 닫혀있는지 확인
  const isStageClosed = stage?.status === 'close' || stage?.status === 'closed';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex justify-center items-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDelay: '0.1s' }}></div>
        </div>
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex justify-center items-center">
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <Award className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-300 mb-2">Stage Not Found</h1>
          <p className="text-gray-500">The requested stage could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <TrackHeader
        onBack={() => {
          const targetTrackId = trackId || stage?.track?.id;
          if (targetTrackId) {
            navigate(`/track/${targetTrackId}`);
          } else {
            navigate('/dashboard');
          }
        }}
      />
      
      <main className='relative px-8 pb-8 pt-6'>
        {/* Stage Header */}
        <div className='mb-8'>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Music className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className='text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent'>
                {stage.title}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold rounded-full">
                  V{stage.version}
                </span>
                <span className="text-gray-400 text-sm">Stage</span>
              </div>
            </div>
          </div>
          
          {/* Stage Description Card */}
          <div className='rounded-2xl bg-gradient-to-r from-gray-800/80 to-gray-700/80 p-8 shadow-2xl border border-gray-600/50 backdrop-blur-sm'>
            <div className='flex items-start gap-6'>
              <div className='flex-shrink-0'>
                <div className='w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg'>
                  <svg className='w-7 h-7 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  </svg>
                </div>
              </div>
              <div className='flex-1'>
                <h4 className='text-xl font-semibold text-white mb-3'>Stage Description</h4>
                <p className='text-gray-300 leading-relaxed text-lg'>{stage.description || 'No description provided for this stage.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviewers Section */}
        <div className='mb-8'>
          <div className='rounded-2xl bg-gradient-to-r from-purple-900/60 to-blue-900/60 p-8 shadow-2xl border border-purple-500/30 backdrop-blur-sm'>
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center gap-4'>
                <div className='w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg'>
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h4 className='text-xl font-semibold text-white mb-1'>Stage Reviewers</h4>
                  <p className='text-gray-300 text-sm'>Collaborative review team</p>
                </div>
              </div>
              
              <div className='flex items-center gap-4'>
                {/* Refresh Button */}
                <button
                  onClick={() => stageId && fetchReviewers(stageId)}
                  disabled={reviewersLoading}
                  className='p-3 rounded-xl bg-gray-700/50 text-white hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-600/50 hover:border-gray-500/50'
                  title="Refresh Reviewers"
                >
                  <svg 
                    className={`w-5 h-5 ${reviewersLoading ? 'animate-spin' : ''}`} 
                    fill='none' 
                    stroke='currentColor' 
                    viewBox='0 0 24 24'
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                  </svg>
                </button>
                
                {/* Reviewers Avatars */}
                <div className='flex -space-x-3'>
                  {reviewersLoading ? (
                    <div className="h-14 w-14 rounded-full border-4 border-purple-500 bg-gray-700 flex items-center justify-center animate-pulse">
                      <svg className='w-6 h-6 text-purple-400 animate-spin' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                      </svg>
                    </div>
                  ) : reviewersError ? (
                    <div className="h-14 w-14 rounded-full border-4 border-red-500 bg-red-900/50 flex items-center justify-center">
                      <svg className='w-6 h-6 text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z' />
                      </svg>
                    </div>
                  ) : reviewers && reviewers.length > 0 ? (
                    <>
                      {(showAllReviewers ? reviewers : reviewers.slice(0, MAX_DISPLAYED_REVIEWERS)).map((reviewer, _index) => (
                        <div key={reviewer.id} className='relative group'>
                          <div className='h-14 w-14 rounded-full border-4 border-white bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-lg hover:scale-110 transition-all duration-300 ring-2 ring-purple-500/50'>
                            {reviewer.user?.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className='absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-10 border border-gray-600 shadow-lg'>
                            {reviewer.user?.username || 'Unknown User'}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                          </div>
                        </div>
                      ))}
                      {reviewers.length > MAX_DISPLAYED_REVIEWERS && (
                        <button
                          onClick={() => setShowAllReviewers(!showAllReviewers)}
                          className='h-14 w-14 rounded-full border-4 border-white bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 flex items-center justify-center text-white font-bold text-sm shadow-lg hover:scale-110 transition-all duration-300'
                          title={showAllReviewers ? 'Show Less' : `Show ${reviewers.length - MAX_DISPLAYED_REVIEWERS} more`}
                        >
                          {showAllReviewers ? (
                            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                            </svg>
                          ) : (
                            <span className='text-sm'>+{reviewers.length - MAX_DISPLAYED_REVIEWERS}</span>
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className='flex gap-3'>
                      <div className='h-14 w-14 rounded-full border-4 border-dashed border-gray-500 bg-gray-700/50 flex items-center justify-center'>
                        <svg className='w-6 h-6 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
                        </svg>
                      </div>
                      <div className='h-14 w-14 rounded-full border-4 border-dashed border-gray-500 bg-gray-700/50 flex items-center justify-center'>
                        <svg className='w-6 h-6 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
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

        {/* Stem Sets Section */}
        <div className='mb-8'>
          <div className='mb-6 flex items-center justify-between'>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className='text-2xl font-bold text-white'>STEM SET LIST</h3>
                <p className='text-gray-400 text-sm'>Upload and manage your stem sets</p>
              </div>
            </div>
            
            {!isStageClosed && !isUploadModalOpen ? (
              <button
                className='flex items-center gap-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-white transition-all duration-200 hover:from-purple-500 hover:to-purple-600 shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 border border-purple-500/50'
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload size={18} />
                <span className='font-semibold'>UPLOAD</span>
              </button>
            ) : isStageClosed ? (
              <button
                className='flex items-center gap-3 rounded-xl bg-gray-600/50 px-6 py-3 text-gray-400 cursor-not-allowed border border-gray-600/50'
                disabled
              >
                <Upload size={18} />
                <span className='font-semibold'>UPLOAD (스테이지가 닫혀있습니다)</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Stem Sets Grid */}
        <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center'>
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-16">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <span className="text-white text-lg">Loading stem sets...</span>
              </div>
            </div>
          ) : (!upstreams || upstreams.length === 0) ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center mb-6">
                <Music className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Stem Sets Available</h3>
              <p className="text-gray-400 text-center max-w-md">Start by uploading your first stem set to begin the review process.</p>
            </div>
          ) : (
            upstreams.map((upstream) => (
              <StemSetCard
                key={upstream.id}
                upstream={upstream}
                onDetail={() => handleDetail(upstream)}
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
      {/* The audio element is removed as per the edit hint. */}

      {/* Custom CSS for slider */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          z-index: 1000;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          z-index: 1000;
        }
        
        /* 버튼 클릭 가능성 보장 */
        button {
          position: relative;
          z-index: 1000 !important;
          pointer-events: auto !important;
        }
        
        /* 슬라이더 클릭 가능성 보장 */
        input[type="range"] {
          position: relative;
          z-index: 1000 !important;
          pointer-events: auto !important;
        }
        
        /* 호버 오버레이가 활성화될 때만 포인터 이벤트 허용 */
        .group:hover .absolute.inset-0.bg-gradient-to-t {
          pointer-events: auto !important;
        }
        
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

export default StagePage;