import React, { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
import { Upload, Bell, Settings} from 'lucide-react';
import Logo from '../components/Logo';
import { UploadModal } from '../components';
import trackService from '../services/trackService';
import { Track } from '../types/api';
import tapeImg from '../assets/tape.png';

/**
 * 보컬 업데이트 정보를 담는 인터페이스
 * 각 업데이트는 고유 ID, 제목, 아티스트, 상태, 설명을 가짐
 */
interface VocalUpdate {
  id: string;
  title: string;
  artist: string;
  status: 'ACTIVE' | 'REJECTED'; // 업데이트 상태: 활성화 또는 거부됨
  description?: string; // 선택적 설명
}

/**
 * StagePage 컴포넌트
 * 음악 프로젝트의 스테이지별 업데이트를 관리하는 페이지
 * 보컬 업데이트 목록을 표시하고, 업로드 기능을 제공
 */
const StagePage: React.FC = () => {
  /**
   * 보컬 업데이트 목록 (현재는 하드코딩된 목업 데이터)
   * 실제 구현에서는 API에서 가져올 데이터
   */
  const vocalUpdates: VocalUpdate[] = [
    {
      id: '1',
      title: 'vocal update',
      artist: 'SALLY',
      status: 'ACTIVE',
    },
    {
      id: '2',
      title: 'vocal update',
      artist: 'SALLY',
      status: 'ACTIVE',
      description:
        "The drum files were amazing, but I didn't like the vocal files. This stage requires a vocal upgrade .....",
    },
    {
      id: '3',
      title: 'vocal update',
      artist: 'SALLY',
      status: 'ACTIVE',
    },
    {
      id: '4',
      title: 'vocal update',
      artist: 'SALLY',
      status: 'REJECTED',
    },
    {
      id: '5',
      title: 'vocal update',
      artist: 'SALLY',
      status: 'REJECTED',
    },
    {
      id: '6',
      title: 'vocal update',
      artist: 'SALLY',
      status: 'ACTIVE',
    },
    {
      id: '7',
      title: 'vocal update',
      artist: 'SALLY',
      status: 'REJECTED',
    },
    {
      id: '8',
      title: 'vocal update',
      artist: 'SALLY',
      status: 'REJECTED',
    },
  ];

  // 업로드 모달의 열림/닫힘 상태 관리
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  
  // 테스트용 목업 트랙 ID (실제로는 useParams에서 가져올 예정)
  const trackId = "mock-track-123";
  // const { trackId } = useParams<{ trackId: string }>();
  
  // 현재 트랙 정보를 저장하는 상태
  const [track, setTrack] = useState<Track | null>(null);

  /**
   * 컴포넌트 마운트 시 트랙 정보를 가져오는 useEffect
   * trackId가 변경될 때마다 새로운 트랙 정보를 요청
   */
  useEffect(() => {
    if (trackId) {
      trackService.getTrackById(trackId)
        .then(response => {
          if (response.success) {
            setTrack(response.data || null);
          } else {
            console.error("Failed to fetch track details");
          }
        })
        .catch(error => console.error("Error fetching track details:", error));
    }
  }, [trackId]);
  
  /**
   * 업로드 완료 시 호출되는 콜백 함수
   * 현재는 빈 함수이지만, 업로드 완료 후 필요한 작업을 추가할 수 있음
   */
  const handleUploadComplete = () => {
    //
  }

  // StemSetCard 컴포넌트: 카세트 테이프 형태의 카드
  interface StemSetCardProps {
    index: number;
    isPlaying: boolean;
    seek: number;
    onPlayToggle: () => void;
    onSeek: (value: number) => void;
    onDetail: () => void;
  }

  const StemSetCard: React.FC<StemSetCardProps> = ({
    index, isPlaying, seek, onPlayToggle, onSeek, onDetail
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
      <div
        className="relative w-[320px] h-[200px] flex flex-col items-center justify-end shadow-lg"
        style={{
          backgroundImage: `url(${tapeImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 카드 타이틀 */}
        <div className="absolute top-8 left-0 w-full text-center text-xl font-bold text-black drop-shadow">
          AWSOME MIX #{index + 1}
        </div>
        {/* Hover 시 나타나는 오버레이 */}
        <div
          className={`absolute left-0 top-0 w-full px-6 py-4 flex items-start justify-center transition-all duration-300 z-20
            ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
          style={{
            background: 'rgba(30,30,30,0.85)',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            minHeight: 80,
          }}
        >
          <span className="text-white text-sm text-center leading-relaxed">
            The drum files were amazing, but I didn't like the vocal files. This stage requires a vocal upgrade .....
          </span>
        </div>
        {/* Seek Bar + 버튼 fade in */}
        <div
          className={`w-full flex flex-col items-center transition-all duration-300 z-10
            ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        >
          <input
            type="range"
            min={0}
            max={100}
            value={seek}
            onChange={e => onSeek(Number(e.target.value))}
            className="w-3/4 mb-2 accent-purple-700"
            style={{ zIndex: 2 }}
          />
          {/* 버튼 영역 */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onPlayToggle}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-700 text-white shadow-lg hover:bg-purple-800 border-2 border-white"
              aria-label={isPlaying ? '정지' : '재생'}
            >
              {isPlaying ? (
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><rect x="4" y="4" width="4" height="12" rx="1"/><rect x="12" y="4" width="4" height="12" rx="1"/></svg>
              ) : (
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><polygon points="4,4 16,10 4,16"/></svg>
              )}
            </button>
            <button
              onClick={onDetail}
              className="px-4 py-2 rounded-full bg-yellow-300 text-black font-semibold shadow hover:bg-yellow-400 border-2 border-white"
            >
              Detail
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Stem Set 카드 상태 관리용 목업 (실제 구현 시 API 연동 필요)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [seekValues, setSeekValues] = useState<number[]>(vocalUpdates.map(() => 0));
  const handlePlayToggle = (idx: number) => {
    setPlayingIndex(playingIndex === idx ? null : idx);
  };
  const handleSeek = (idx: number, value: number) => {
    setSeekValues(prev => prev.map((v, i) => (i === idx ? value : v)));
  };
  const handleDetail = (idx: number) => {
    // 추후 상세 모달 구현 예정
    alert(`Detail for AWSOME MIX #${idx + 1}`);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900'>
      {/* 헤더 섹션 - 로고, 네비게이션, 알림, 설정 */}
      <header className='flex items-center justify-between px-8 py-6'>
        <div className='flex items-center gap-8'>
          <Logo/>
          {/* 네비게이션 메뉴 */}
          <nav className='flex gap-8'>
            <button className='text-gray-300 transition-colors hover:text-white'>
              TRACK
            </button>
            <button className='border-b-2 border-white pb-1 text-white'>
              STAGE
            </button>
          </nav>
        </div>
        {/* 우측 헤더 영역 - 알림 및 설정 */}
        <div className='flex items-center gap-4'>
          <button className='relative text-white transition-colors hover:text-gray-300'>
            <Bell size={20} />
            {/* 알림 개수 표시 */}
            <span className='absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white'>
              1
            </span>
          </button>
          <button className='text-white transition-colors hover:text-gray-300'>
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className='px-8 pb-8'>
        {/* 스테이지 정보 섹션 */}
        <div className='mb-8'>
          <h2 className='mb-4 text-3xl font-bold text-white'>OPEN Stage - 5</h2>
          {/* 스테이지 메시지 표시 영역 */}
          <div className='mb-6 rounded-lg bg-gray-700 p-4'>
            <p className='text-white'>스테이지 업데이트 쌓는 메시지</p>
          </div>
        </div>

        {/* 리뷰어 정보 섹션 - 우측 정렬 */}
        <div className='mb-8 flex justify-end'>
          <div className='flex items-center gap-3'>
            <span className='text-gray-300'>REVIEWER :</span>
            {/* 리뷰어 아바타들 */}
            <div className='flex -space-x-2'>
              <div className='h-8 w-8 rounded-full border-2 border-white bg-gray-400'></div>
              <div className='h-8 w-8 rounded-full border-2 border-white bg-gray-400'></div>
            </div>
          </div>
        </div>

        {/* 업로드 섹션 */}
        <div className='mb-8'>
          <div className='mb-6 flex items-center gap-4'>
            <h3 className='text-xl font-medium text-white'>STEM SET LIST</h3>
            {/* 업로드 버튼 - 클릭 시 모달 열림 */}
            <button className='flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-500'
              onClick={() => setUploadModalOpen(true)}
            >
              <Upload size={16} />
              <span className='text-sm font-medium'>UPLOAD</span>
            </button>
          </div>
        </div>

        {/* 카드 그리드 - 반응형 레이아웃 */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {vocalUpdates.map((update, idx) => (
            <StemSetCard
              key={update.id}
              index={idx}
              isPlaying={playingIndex === idx}
              seek={seekValues[idx]}
              onPlayToggle={() => handlePlayToggle(idx)}
              onSeek={value => handleSeek(idx, value)}
              onDetail={() => handleDetail(idx)}
            />
          ))}
        </div>
      </main>
      
      {/* 업로드 모달 - 조건부 렌더링 */}
      {trackId && (
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          projectId={trackId}
          projectName={track ? track.name : "Loading..."}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  );
};

export default StagePage;
