import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, Music, Clock, Award, Eye, CheckCircle, XCircle, Check } from 'lucide-react';
// import Logo from '../components/Logo';
import UploadModal from '../components/UploadModal';
import trackService from '../services/trackService';
import { getStageDetail } from '../services/stageService';
import { getStageUpstreams } from '../services/upstreamService';
import { getStageReviewers } from '../services/stageReviewerService';
import { getUpstreamReviews, ReviewerWithStatus } from '../services/upstreamReviewService';
import { Track, Stage, Upstream, StageReviewer } from '../types/api';
import tapeActive from '../assets/activeTape.png';
import tapeApproved from '../assets/approveTape.png';
import tapeRejected from '../assets/rejectedTape.png';
import TrackHeader from '../components/TrackHeader';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import PresignedImage from '../components/PresignedImage';

const StagePage: React.FC = () => {
  const { trackId, stageId } = useParams<{ trackId: string; stageId: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();
  // 상태 관리
  const [stage, setStage] = useState<Stage | null>(null);
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [reviewers, setReviewers] = useState<StageReviewer[]>([]);
  const [reviewersLoading, setReviewersLoading] = useState(false);
  const [upstreamReviews, setUpstreamReviews] = useState<{[key: string]: ReviewerWithStatus[]}>({});

  // 트랙 정보 가져오기
  useEffect(() => {
    const fetchTrackData = async () => {
      try {
        let trackData = null;

        // trackId가 있으면 trackId로 트랙 정보 가져오기
        if (trackId) {
          console.log('🔍 Fetching track by trackId:', trackId);
          const response = await trackService.getTrackById(trackId);
          if (response.success) {
            trackData = response.data;
            console.log('✅ Track fetched by trackId:', trackData);
          } else {
            console.error("❌ Failed to fetch track by trackId");
          }
        }

        // trackId가 없거나 실패했고, stage가 있으면 stage에서 트랙 정보 가져오기
        if (!trackData && stage?.track) {
          console.log('🔍 Using track info from stage:', stage.track);
          trackData = stage.track;
        }

        setTrack(trackData || null);
        console.log('🎵 Final track data set:', trackData);

      } catch (error) {
        console.error("❌ Error fetching track details:", error);
      }
    };

    // stage 정보가 로드된 후에 트랙 정보 가져오기
    if (stage || trackId) {
      fetchTrackData();
    }
  }, [trackId, stage]);

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

        // 각 upstream의 review 데이터 가져오기
        if (upstreamsResponse && upstreamsResponse.length > 0) {
          for (const upstream of upstreamsResponse) {
            await fetchUpstreamReviews(upstream.id);
          }
        }

        // 리뷰어 목록 가져오기
        setReviewersLoading(true);
        const reviewersResponse = await getStageReviewers(stageId);
        setReviewers(reviewersResponse || []);

      } catch (error) {
        console.error("Error fetching stage data:", error);
      } finally {
        setLoading(false);
        setReviewersLoading(false);
      }
    };

    fetchStageData();
  }, [stageId]);

  const handleUploadComplete = async () => {
    try {
      console.log('🔄 Refreshing upstreams after upload completion...');

      if (stageId) {
        // 로딩 상태 설정
        setLoading(true);

        const response = await getStageUpstreams(stageId);
        console.log('✅ Upstreams refreshed successfully:', response);

        if (response && Array.isArray(response)) {
          setUpstreams(response);
        } else {
          console.warn('⚠️ Unexpected response format:', response);
          setUpstreams([]);
        }
      } else {
        console.error('❌ Stage ID is missing for upstream refresh');
      }
    } catch (error) {
      console.error('❌ Error refreshing upstreams:', error);
      showError('업스트림 목록 새로고침 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
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

  // Upstream review 데이터 가져오기
  const fetchUpstreamReviews = async (upstreamId: string) => {
    try {
      const reviews = await getUpstreamReviews(upstreamId);
      setUpstreamReviews(prev => ({
        ...prev,
        [upstreamId]: reviews
      }));
    } catch (error) {
      console.error('Failed to fetch upstream reviews:', error);
    }
  };

  // Approve 정보 계산
  const getApproveInfo = (upstreamId: string) => {
    const reviews = upstreamReviews[upstreamId] || [];
    const totalReviewers = reviews.length;
    const approvedCount = reviews.filter(review => review.status === 'approved').length;
    return { totalReviewers, approvedCount };
  };

  // Reviewer 컴포넌트
  const ReviewerCard: React.FC<{ reviewer: StageReviewer }> = ({ reviewer }) => {
    return (
      <div className="relative group">
        <div className="w-[200px] h-[140px] rounded-lg overflow-hidden relative">
          {reviewer.user.image_url ? (
            <img
              src={reviewer.user.image_url}
              alt={reviewer.user.username}
              className="w-full h-full object-cover"
              style={{
                objectPosition: 'center',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {reviewer.user.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          
          {/* 검은색 반투명 그라데이션 오버레이 */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          
          {/* Role 텍스트 */}
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-white text-sm font-medium truncate">
              {reviewer.user.username}
            </p>
            <p className="text-gray-300 text-xs">
              {reviewer.role || 'Collaborator'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  interface StemSetCardProps {
    upstream: Upstream;
    onDetail: () => void;
  }

  const StemSetCard: React.FC<StemSetCardProps> = ({
    upstream, onDetail
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    // ACTIVE를 WAITING으로 표시
    let status = upstream.status?.toUpperCase() as 'WAITING' | 'REJECTED' | 'APPROVED' | 'ACTIVE';
    if (status === 'ACTIVE') {
      status = 'WAITING';
    }

    console.log('[DEBUG] Upstream status:', upstream.status, 'Normalized:', status);

    const statusConfig = {
      WAITING: {
        color: 'bg-gradient-to-r from-purple-500 to-indigo-600',
        textColor: 'text-white',
        icon: <div className="w-2 h-2 bg-white rounded-full animate-pulse" />,
        border: 'border-purple-400'
      },
      REJECTED: {
        color: 'bg-gradient-to-r from-red-500 to-red-600',
        textColor: 'text-white',
        icon: <XCircle className="w-4 h-4" />,
        border: 'border-red-400'
      },
      APPROVED: {
        color: 'bg-gradient-to-r from-emerald-500 to-green-500',
        textColor: 'text-white',
        icon: <CheckCircle className="w-4 h-4" />,
        border: 'border-emerald-400'
      }
    };

    const config = statusConfig[status] || statusConfig.WAITING;
    const tapeImg = status === 'APPROVED' ? tapeApproved : status === 'REJECTED' ? tapeRejected : tapeActive;

    // 디버깅을 위한 로그
    console.log('[DEBUG] Upstream title:', {
      id: upstream.id,
      title: upstream.title,
      titleType: typeof upstream.title,
      titleAsString: upstream.title !== null && upstream.title !== undefined ? String(upstream.title) : 'N/A',
      titleLength: upstream.title !== null && upstream.title !== undefined ? String(upstream.title).length : 0,
      titleTrimmed: upstream.title !== null && upstream.title !== undefined ? String(upstream.title).trim() : 'N/A',
      titleTrimmedLength: upstream.title !== null && upstream.title !== undefined ? String(upstream.title).trim().length : 0
    });

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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
            <Clock className="w-3 h-3 text-white" />
            <span className="text-white text-xs font-medium">
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

        {/* Approve Info */}
        <div className="absolute bottom-4 left-4 z-30">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
            <Check className="w-3 h-3 text-white" />
            <span className="text-white text-sm font-medium">
              {(() => {
                const { totalReviewers, approvedCount } = getApproveInfo(upstream.id);
                return `${approvedCount}/${totalReviewers}`;
              })()}
            </span>
          </div>
        </div>

        {/* Tape Image */}
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ pointerEvents: 'none' }}>
          <img
            src={tapeImg}
            alt={`Stem Set ${upstream.title}`}
            className={`w-full h-full object-contain transition-transform duration-700 ${isHovered ? 'scale-110 rotate-2' : 'scale-100'}`}
          />
        </div>

        {/* Title Overlay - 항상 표시 */}
        <div className="absolute top-[82px] left-0 w-full text-center z-20">
          <div>
            <h3 className="text-xl font-bold text-black drop-shadow-lg px-4">
              {upstream.title && typeof upstream.title === 'string' && upstream.title.trim() ? upstream.title : `STEM SET #${upstream.title}`}
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

            {/* Detail Button - 오른쪽 정렬 */}
            <div className="flex items-center justify-end">
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

  // 스테이지가 닫혀있거나 승인된 상태인지 확인
  const isStageClosed = stage?.status === 'close' || stage?.status === 'closed';
  const isStageApproved = stage?.status === 'approve' || stage?.status === 'APPROVED';
  const isUploadDisabled = isStageClosed || isStageApproved;

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

      <main className='relative px-8 pb-8 pt-6 max-w-[1280px] mx-auto'>
        {/* Stage Header */}
        <div className='mb-12'>
          <div className="flex items-start gap-8 mb-8">
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0" style={{ width: '400px', height: '400px' }}>
              {track ? (
                <PresignedImage
                  trackId={track.id}
                  imageUrl={track.image_url}
                  alt={`${track.title} album cover`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-16 h-16 text-white" />
              )}
            </div>
            <div className="flex-1 max-w-[830px]">
              <h1 className='text-6xl font-bold text-white mb-6'>
                {track?.title || 'Unknown Track'}
              </h1>
              <div className="space-y-4">
                <p className="text-2xl text-gray-300 font-semibold">
                  Currently creating version 
                  <span style={{ color: '#8528d8', fontWeight: 'bold' }}>{stage.version}</span>
                </p>
                <p className="text-lg text-gray-400">
                  creating started at
                  {stage.created_at ? new Date(stage.created_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }) : ''}
                </p>
                {stage.description && (
                  <p className="text-3xl text-gray-200 leading-relaxed mt-6 font-medium">
                    {stage.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Reviewers Section - 두 번째 행 */}
          <div className="mt-8">
            {/* Reviewers Section */}
            <div className="w-full">
              <h2 className="text-3xl font-bold text-white mb-6">Reviewers</h2>
              {reviewersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  <span className="ml-3 text-white text-sm">Loading reviewers...</span>
                </div>
              ) : reviewers.length > 0 ? (
                <div className="flex gap-4 justify-start">
                  {reviewers.map((reviewer) => (
                    <ReviewerCard key={reviewer.id} reviewer={reviewer} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Music className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-sm">No reviewers assigned</p>
                </div>
              )}
            </div>
          </div>
          {/* 디버깅 정보 */}
          {import.meta.env.DEV && (
            <div className="text-xs text-gray-500 mt-2">
              Debug: Track ID: {track?.id}, Title: {track?.title}, Image URL: {track?.image_url || 'None'}
            </div>
          )}
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
                <p className='text-gray-400 text-sm'>Submit your work and get feedback from your team</p>
              </div>
            </div>

            {!isUploadDisabled && !isUploadModalOpen ? (
              <button
                className='flex items-center gap-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-white transition-all duration-200 hover:from-purple-500 hover:to-purple-600 shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 border border-purple-500/50'
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload size={18} />
                <span className='font-semibold'>UPLOAD</span>
              </button>
            ) : isUploadDisabled ? (
              <button
                className='flex items-center gap-3 rounded-xl bg-gray-600/50 px-6 py-3 text-gray-400 cursor-not-allowed border border-gray-600/50'
                disabled
              >
                <Upload size={18} />
                <span className='font-semibold'>
                  UPLOAD ({isStageClosed ? '스테이지가 닫혀있습니다' : isStageApproved ? '스테이지가 승인되었습니다' : '업로드가 비활성화되었습니다'})
                </span>
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
            // 생성 시간 순으로 정렬 (최신 것부터 오래된 순)
            upstreams
              .sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB.getTime() - dateA.getTime(); // 내림차순 정렬 (최신 것부터)
              })
              .map((upstream) => (
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
          onClose={() => {
            console.log('🔒 Closing upload modal...');
            setUploadModalOpen(false);
          }}
          projectId={stage.track.id}
          projectName={track ? track.title : ""}
          stageId={stageId}
          stageVersion={stage.version}
          onComplete={() => {
            console.log('✅ Upload completed, refreshing data...');
            // 약간의 지연을 두어 상태 업데이트가 완료된 후 새로고침
            setTimeout(() => {
              handleUploadComplete();
            }, 100);
          }}
        />
      )}

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