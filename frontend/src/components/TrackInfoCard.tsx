import React, { useState } from 'react';
import { Play, Plus, Pause } from 'lucide-react';
import { Button, StemPlayer } from './';
import { Track } from '../types/api';
import { StemStreamingInfo } from '../services/streamingService';

interface TrackInfoCardProps {
  track: Track;
  stems?: StemStreamingInfo[];
  onPlay?: () => void;
  onShowAllStems?: () => void;
  onRollBack?: () => void;
  stemsLoading?: boolean;
}

const TrackInfoCard: React.FC<TrackInfoCardProps> = ({
  track,
  stems = [],
  onPlay,
  onShowAllStems,
  onRollBack,
  stemsLoading = false
}) => {
  const [showPlayer, setShowPlayer] = useState(false);

  const handlePlayClick = () => {
    if (stems.length > 0) {
      setShowPlayer(!showPlayer);
    } else if (onPlay) {
      onPlay();
    }
  };

  return (
    <div className="mb-12">
      <div className="flex gap-8 mb-6">
        {/* Album Cover */}
        <div className="flex-shrink-0">
          <img src="/cover.jpg" alt={track.name} className="w-80 h-80 rounded-lg shadow-lg object-cover" />
        </div>

        {/* Track Details */}
        <div className="flex-1">
          {/* Track Info */}
          <h2 className="text-4xl font-bold text-white mb-2">{track.name}</h2>
          <p className="text-gray-400 text-lg mb-4">{track.created_date}</p>
          <div className="flex gap-6 mb-4">
            <span className="text-gray-400">{track.genre}</span>
            <span className="text-gray-400">{track.bpm}</span>
            <span className="text-gray-400">{track.key_signature}</span>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">{track.owner_id.username}</h3>
            <p className="text-gray-300 leading-relaxed">{track.description}</p>
          </div>

          <div className="flex gap-4 mb-6">
            <Button 
              variant="primary" 
              size="lg" 
              className="flex items-center gap-2"
              onClick={handlePlayClick}
              disabled={stemsLoading}
            >
              {stemsLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : showPlayer ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
              {stemsLoading ? 'Loading...' : showPlayer ? 'HIDE PLAYER' : 'PLAY'}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={onShowAllStems}
            >
              모든 스템보기
            </Button>
          </div>

          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={onRollBack}
          >
            roll back
          </Button>
        </div>

        {/* User Avatars */}
        <div className="flex-shrink-0 flex items-start gap-2">
          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">S</span>
          </div>
          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">M</span>
          </div>
          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">A</span>
          </div>
          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
            <Plus size={16} className="text-white" />
          </div>
        </div>
      </div>

      {/* Stem Player */}
      {showPlayer && stems.length > 0 && (
        <div className="mt-6">
          <StemPlayer stems={stems} />
        </div>
      )}
    </div>
  );
};

export default TrackInfoCard; 