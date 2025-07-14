import React, { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
import { Play, Info, Upload, Bell, Settings} from 'lucide-react';
import Logo from '../components/Logo';
import UploadModal from '../components/UploadModal';
import trackService from '../services/trackService';
import { Track } from '../types/api';

interface VocalUpdate {
  id: string;
  title: string;
  artist: string;
  status: 'ACTIVE' | 'REJECTED';
  description?: string;
}

const StagePage: React.FC = () => {
  const [selectedCardId, setSelectedCardId] = useState<string>('1');

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

  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  // Mock trackId for testing UploadModal
  const trackId = "mock-track-123";
  // const { trackId } = useParams<{ trackId: string }>();
  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (trackId) {
      trackService.getTrackById(trackId)
        .then(response => {
          if (response.data) {
            setTrack(response.data.data || null);
          } else {
            console.error("Failed to fetch track details");
          }
        })
        .catch(error => console.error("Error fetching track details:", error));
    }
  }, [trackId]);
  
  const handleUploadComplete = () => {
    //
  }

  const CardComponent: React.FC<{ update: VocalUpdate; selected: boolean; onClick: () => void; }> = ({ update, selected, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        className={`group relative cursor-pointer rounded-lg p-6 transition-all duration-300 ${
          selected
            ? 'border-2 border-purple-400 bg-gradient-to-br from-purple-600 to-purple-700'
            : update.status === 'ACTIVE'
              ? 'bg-gradient-to-br from-purple-800 to-purple-900 hover:from-purple-700 hover:to-purple-800'
              : 'bg-gray-600 hover:bg-gray-500'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {/* Status Badge */}
        <div className='absolute right-4 top-4'>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              update.status === 'ACTIVE'
                ? 'bg-green-500 text-white'
                : 'bg-gray-500 text-gray-300'
            }`}
          >
            {update.status}
          </span>
        </div>

        {/* Main Content */}
        <div className='mb-8'>
          <h3 className='mb-2 text-xl font-medium text-white'>
            {update.title}
          </h3>
          <p className='text-sm text-gray-300'>{update.artist}</p>
        </div>

        {/* Description on Hover */}
        {isHovered && update.description && (
          <div className='absolute inset-0 flex items-center justify-center rounded-lg bg-black bg-opacity-90 p-6'>
            <p className='text-sm leading-relaxed text-white'>
              {update.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex gap-3'>
          <button className='flex items-center gap-2 rounded-md bg-white px-4 py-2 text-black transition-colors hover:bg-gray-100'>
            <Play size={16} />
            <span className='text-sm font-medium'>PLAY</span>
          </button>
          <button className='flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-500'>
            <Info size={16} />
            <span className='text-sm font-medium'>DETAIL</span>
          </button>
        </div>
      </div>
    );
  };





  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900'>
      {/* Header */}
      <header className='flex items-center justify-between px-8 py-6'>
        <div className='flex items-center gap-8'>
          <Logo/>
          <nav className='flex gap-8'>
            <button className='text-gray-300 transition-colors hover:text-white'>
              TRACK
            </button>
            <button className='border-b-2 border-white pb-1 text-white'>
              STAGE
            </button>
          </nav>
        </div>
        <div className='flex items-center gap-4'>
          <button className='relative text-white transition-colors hover:text-gray-300'>
            <Bell size={20} />
            <span className='absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white'>
              1
            </span>
          </button>
          <button className='text-white transition-colors hover:text-gray-300'>
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className='px-8 pb-8'>
        {/* Stage Info */}
        <div className='mb-8'>
          <h2 className='mb-4 text-3xl font-bold text-white'>OPEN Stage - 5</h2>
          <div className='mb-6 rounded-lg bg-gray-700 p-4'>
            <p className='text-white'>스테이지 업데이트 쌓는 메시지</p>
          </div>
        </div>

        {/* Reviewer Info */}
        <div className='mb-8 flex justify-end'>
          <div className='flex items-center gap-3'>
            <span className='text-gray-300'>REVIEWER :</span>
            <div className='flex -space-x-2'>
              <div className='h-8 w-8 rounded-full border-2 border-white bg-gray-400'></div>
              <div className='h-8 w-8 rounded-full border-2 border-white bg-gray-400'></div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className='mb-8'>
          <div className='mb-6 flex items-center gap-4'>
            <h3 className='text-xl font-medium text-white'>DROP LIST</h3>
            <button className='flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-500'
              onClick={() => setUploadModalOpen(true)}
            >
              <Upload size={16} />
              <span className='text-sm font-medium'>UPLOAD</span>
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {vocalUpdates.map((update) => (
            <CardComponent 
              key={update.id} 
              update={update} 
              selected={update.id === selectedCardId}
              onClick={() => setSelectedCardId(update.id)}
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
