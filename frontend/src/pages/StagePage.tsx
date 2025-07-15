import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, Bell, Settings } from 'lucide-react';
import Logo from '../components/Logo';
import UploadModal from '../components/UploadModal';
import trackService from '../services/trackService';
import { getStageDetail } from '../services/stageService';
import { getStageUpstreams } from '../services/upstreamService';
import { getStageReviewers } from '../services/stageReviewerService';
import streamingService from '../services/streamingService';
import { Track, Stage, Upstream, StageReviewer } from '../types/api';
import tapeActive from '../assets/activeTape.png';
import tapeApproved from '../assets/approveTape.png';
import tapeRejected from '../assets/rejectedTape.png';

const StagePage: React.FC = () => {
  const { trackId, stageId } = useParams<{ trackId: string; stageId: string }>();
  
  // 상태 관리
  const [stage, setStage] = useState<Stage | null>(null);
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [reviewers, setReviewers] = useState<StageReviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);

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
        setUpstreams(upstreamsResponse);

        // 리뷰어 목록 가져오기
        const reviewersResponse = await getStageReviewers(stageId);
        setReviewers(reviewersResponse);

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
  }

  const StemSetCard: React.FC<StemSetCardProps> = ({
    upstream, isPlaying, seek, onPlayToggle, onSeek, onDetail
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    const status = upstream.status as 'ACTIVE' | 'REJECTED' | 'APPROVED';
    
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
          </div>
        </div>
      </div>
    );
  };

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [seekValues, setSeekValues] = useState<number[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // upstreams가 변경될 때 seekValues 배열도 업데이트
  useEffect(() => {
    setSeekValues(upstreams.map(() => 0));
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
          const response = await streamingService.getGuidePresignedUrl(upstream.guide_path, track.id);
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
    // Review Page로 이동
    window.location.href = `/review?upstreamId=${upstream.id}`;
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
      <header className='flex items-center justify-between px-8 py-6'>
        <div className='flex items-center gap-8'>
          <Logo />
          <nav className='flex gap-8'>
            <button className='text-gray-300 transition-colors hover:text-white'>TRACK</button>
            <button className='border-b-2 border-white pb-1 text-white'>STAGE</button>
          </nav>
        </div>
        <div className='flex items-center gap-4'>
          <button className='relative text-white transition-colors hover:text-gray-300'>
            <Bell size={20} />
            <span className='absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white'>1</span>
          </button>
          <button className='text-white transition-colors hover:text-gray-300'><Settings size={20} /></button>
        </div>
      </header>

      <main className='px-8 pb-8'>
        <div className='mb-8'>
          <h2 className='mb-4 text-3xl font-bold text-white'>{stage.title} - V{stage.version}</h2>
          <div className='mb-6 rounded-lg bg-gray-700 p-4'>
            <p className='text-white'>{stage.description}</p>
          </div>
        </div>

        <div className='mb-8 flex justify-end'>
          <div className='flex items-center gap-3'>
            <span className='text-gray-300'>REVIEWER :</span>
            <div className='flex -space-x-2'>
              {reviewers.map((reviewer) => (
                <div key={reviewer.id} className='h-8 w-8 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs text-white'>
                  {reviewer.user?.username?.charAt(0) || 'U'}
                </div>
              ))}
              {reviewers.length === 0 && (
                <>
                  <div className='h-8 w-8 rounded-full border-2 border-white bg-gray-400'></div>
                  <div className='h-8 w-8 rounded-full border-2 border-white bg-gray-400'></div>
                </>
              )}
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
          ) : upstreams.length === 0 ? (
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
          projectName={track ? track.title : "Loading..."}
          stageId={stageId}
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