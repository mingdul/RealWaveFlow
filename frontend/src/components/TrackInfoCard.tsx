import React from 'react';
import { Play, Plus } from 'lucide-react';
import { Button } from './';
import { Track } from '../types/api';

interface TrackInfoCardProps {
  track: Track;
  onPlay?: () => void;
  onShowAllStems?: () => void;
  onRollBack?: () => void;
}

const TrackInfoCard: React.FC<TrackInfoCardProps> = ({
  track,
  onPlay,
  onShowAllStems,
  onRollBack
}) => {
  return (
    <div className="flex gap-8 mb-12">
      {/* Album Cover */}
      <div className="flex-shrink-0">
        <img src="/cover.jpg" alt={track.name} className="w-80 h-80 rounded-lg shadow-lg object-cover" />
      </div>

      {/* Track Details */}
      <div className="flex-1">
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
            onClick={onPlay}
          >
            <Play size={20} />
            PLAY
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
  );
};

export default TrackInfoCard; 