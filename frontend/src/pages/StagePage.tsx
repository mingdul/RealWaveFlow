import React, { useState, useEffect } from 'react';
import { Upload, Bell, Settings } from 'lucide-react';
import Logo from '../components/Logo';
import UploadModal from '../components/UploadModal';
import trackService from '../services/trackService';
import { Track } from '../types/api';
import tapeActive from '../assets/activeTape.png';
import tapeApproved from '../assets/approveTape.png';
import tapeRejected from '../assets/rejectedTape.png';

interface VocalUpdate {
  id: string;
  title: string;
  artist: string;
  status: 'ACTIVE' | 'REJECTED' | 'APPROVED';
  description?: string;
}

const StagePage: React.FC = () => {
  const vocalUpdates: VocalUpdate[] = [
    { id: '1', title: 'vocal update', artist: 'SALLY', status: 'ACTIVE' },
    { id: '2', title: 'vocal update', artist: 'SALLY', status: 'APPROVED', description: "The drum files were amazing, but I didn't like the vocal files. This stage requires a vocal upgrade ....." },
    { id: '3', title: 'vocal update', artist: 'SALLY', status: 'REJECTED' },
    { id: '4', title: 'vocal update', artist: 'SALLY', status: 'REJECTED' },
    { id: '5', title: 'vocal update', artist: 'SALLY', status: 'REJECTED' },
    { id: '6', title: 'vocal update', artist: 'SALLY', status: 'ACTIVE' },
    { id: '7', title: 'vocal update', artist: 'SALLY', status: 'ACTIVE' },
    { id: '8', title: 'vocal update', artist: 'SALLY', status: 'REJECTED' },
  ];

  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const trackId = "mock-track-123";
  const [track, setTrack] = useState<Track | null>(null);

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

  const handleUploadComplete = () => { };

  interface StemSetCardProps {
    index: number;
    isPlaying: boolean;
    seek: number;
    onPlayToggle: () => void;
    onSeek: (value: number) => void;
    onDetail: () => void;
  }

  const StemSetCard: React.FC<StemSetCardProps & { status: 'ACTIVE' | 'REJECTED' | 'APPROVED' }> = ({
    index, isPlaying, seek, onPlayToggle, onSeek, onDetail, status
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    // const shadowFilter = status === 'APPROVED'
    //   ? 'drop-shadow-[0_0_12px_#9d4edd]'
    //   : status === 'ACTIVE'
    //     ? 'drop-shadow-[0_0_12px_#05d182]'
    //     : 'drop-shadow-[0_0_12px_#ff4d6d]';

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
          alt={`Stem Set ${index}`}
          className={`absolute inset-0 w-full h-full object-contain scale-110`} 
          // ${shadowFilter}
        />

        <div className="absolute top-[67px] left-0 w-full text-center text-xl font-bold text-black drop-shadow z-20">
          AWSOME MIX #{index + 1}
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
            {status === 'APPROVED'
              ? "The drum files were amazing, but I didn't like the vocal files. This stage requires a vocal upgrade ....."
              : "No feedback yet."}
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
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><rect x="4" y="4" width="4" height="12" rx="1" /><rect x="12" y="4" width="4" height="12" rx="1" /></svg>
              ) : (
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><polygon points="4,4 16,10 4,16" /></svg>
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
  const [seekValues, setSeekValues] = useState<number[]>(vocalUpdates.map(() => 0));

  const handlePlayToggle = (idx: number) => {
    setPlayingIndex(playingIndex === idx ? null : idx);
  };

  const handleSeek = (idx: number, value: number) => {
    setSeekValues(prev => prev.map((v, i) => (i === idx ? value : v)));
  };

  const handleDetail = (idx: number) => {
    alert(`Detail for AWSOME MIX #${idx + 1}`);
  };

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
          <h2 className='mb-4 text-3xl font-bold text-white'>OPEN Stage - 5</h2>
          <div className='mb-6 rounded-lg bg-gray-700 p-4'>
            <p className='text-white'>스테이지 업데이트 쌓는 메시지</p>
          </div>
        </div>

        <div className='mb-8 flex justify-end'>
          <div className='flex items-center gap-3'>
            <span className='text-gray-300'>REVIEWER :</span>
            <div className='flex -space-x-2'>
              <div className='h-8 w-8 rounded-full border-2 border-white bg-gray-400'></div>
              <div className='h-8 w-8 rounded-full border-2 border-white bg-gray-400'></div>
            </div>
          </div>
        </div>

        <div className='mb-8'>
          <div className='mb-6 flex items-center gap-4'>
            <h3 className='text-xl font-medium text-white'>STEM SET LIST</h3>
            <button
              className='flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-500'
              onClick={() => setUploadModalOpen(true)}
            >
              <Upload size={16} />
              <span className='text-sm font-medium'>UPLOAD</span>
            </button>
          </div>
        </div>

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
              status={update.status}
            />
          ))}
        </div>
      </main>

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
