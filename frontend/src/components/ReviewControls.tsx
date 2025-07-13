import React from 'react';

interface ReviewControlsProps {
  onPlayAllMaster: () => void;
  onPlayAllUpdate: () => void;
  onMuteAll: () => void;
  isMutedAll?: boolean;
}

const ReviewControls: React.FC<ReviewControlsProps> = ({
  onPlayAllMaster,
  onPlayAllUpdate,
  onMuteAll,
  isMutedAll = false
}) => {
  return (
    <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-900 rounded-lg">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-300">Global Controls:</span>
      </div>
      
      <button
        onClick={onPlayAllMaster}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
      >
        <span className="text-lg">▶</span>
        <span>Play All Master</span>
      </button>
      
      <button
        onClick={onPlayAllUpdate}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        <span className="text-lg">▶</span>
        <span>Play All Update</span>
      </button>
      
      <button
        onClick={onMuteAll}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
          isMutedAll
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gray-600 hover:bg-gray-700 text-white'
        }`}
      >
        <span className="text-lg">{isMutedAll ? '🔇' : '🔊'}</span>
        <span>{isMutedAll ? 'Unmute All' : 'Mute All'}</span>
      </button>
    </div>
  );
};

export default ReviewControls;
