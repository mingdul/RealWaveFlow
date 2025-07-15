import React, { useState } from 'react';
import { Play, Plus, Pause } from 'lucide-react';
import { Button, StemPlayer } from './';
import { Track } from '../types/api';
import { StemStreamingInfo } from '../services/streamingService';
import PresignedImage from './PresignedImage';
import ConfirmModal from './ConfirmModal';

interface TrackInfoCardProps {
  track: Track;
  stems?: StemStreamingInfo[];
  onPlay?: () => void;
  onShowAllStems?: () => void;
  onRollBack?: () => void;
  stemsLoading?: boolean;
  versionNumber?: string;
}

const TrackInfoCard: React.FC<TrackInfoCardProps> = ({
  track,
  stems = [],
  onPlay,
  onShowAllStems,
  versionNumber,
  onRollBack,
  stemsLoading = false
}) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);

  const handlePlayClick = () => {
    if (stems.length > 0) {
      setShowPlayer(!showPlayer);
    } else if (onPlay) {
      onPlay();
    }
  };

  const onAddCollaborator = () => {
    console.log('Add collaborator');
  }

  return (
    <div className="text-center">
      {/* Top Action Buttons */}
      <div className="flex justify-between items-center mb-12">
        <Button 
          variant="primary" 
          size="lg"
          className="bg-white text-black hover:bg-gray-200 font-semibold px-8 py-3 rounded-lg"
          onClick={onShowAllStems}
        >
          ALL STEM
        </Button>
        
        <Button 
          variant="secondary" 
          size="lg" 
          className="bg-white text-black hover:bg-gray-200 font-semibold px-8 py-3 rounded-lg"
          onClick={() => setShowRollbackConfirm(true)}
        >
          ROLL BACK
        </Button>
      </div>

      {/* Album Cover - Large and Centered */}
      <div className="mb-8">
        <PresignedImage
          trackId={track.id}
          imageUrl={track.image_url}
          alt={track.title}
          className="w-80 h-80 mx-auto rounded-lg shadow-2xl object-cover"
        />
      </div>

      {/* Track Title */}
      <h1 className="text-6xl font-bold text-white mb-4">{track.title}</h1>
      
      {/* Artist Info */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-8 h-8 bg-white rounded-full"></div>
        <span className="text-white text-lg font-medium">{track.owner_id.username}</span>
        <span className="text-gray-400">•</span>
        <span className="text-gray-400">{track.created_date}</span>
        <span className="text-gray-400">•</span>
        <span className="text-gray-400">{versionNumber}분 44초</span>
      </div>

      {/* Large Play Button */}
      <div className="mb-12">
        <button 
          className="w-20 h-20 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 mx-auto"
          onClick={handlePlayClick}
          disabled={stemsLoading}
        >
          {stemsLoading ? (
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : showPlayer ? (
            <Pause size={32} className="text-white ml-1" />
          ) : (
            <Play size={32} className="text-white ml-1" />
          )}
        </button>
      </div>

      {/* Track Details - Minimized */}
      <div className="text-center text-gray-400 text-sm mb-8">
        <span className="mx-4">{track.genre}</span>
        <span className="mx-4">{track.bpm} BPM</span>
        <span className="mx-4">{track.key_signature}</span>
      </div>

      {/* Collaborators */}
      <div className="flex justify-center items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm">S</span>
        </div>
        <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm">M</span>
        </div>
        <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm">A</span>
        </div>
        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-500" onClick={onAddCollaborator}>
          <Plus size={16} className="text-white" />
        </div>
      </div>

      {/* Stem Player */}
      {showPlayer && stems.length > 0 && (
        <div className="mt-8">
          <StemPlayer stems={stems} />
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showRollbackConfirm}
        title="Are you sure you want to roll back?"
        description="All stages created after the selected version will be permanently deleted. This action cannot be undone."
        confirmText="Confirm Rollback"
        cancelText="Cancel"
        onConfirm={() => {
          setShowRollbackConfirm(false);
          if (onRollBack) onRollBack();
        }}
        onCancel={() => setShowRollbackConfirm(false)}
      />
    </div>
  );
};

export default TrackInfoCard;
