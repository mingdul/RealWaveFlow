import React from 'react';
import { Version } from '../types/api';

interface VersionCardProps {
  version: Version;
  isSelected?: boolean;
  onClick?: (version: Version) => void;
  index: number;
}

const VersionCard: React.FC<VersionCardProps> = ({ version, isSelected, onClick, index }) => {
  const getCardBgColor = () => {
    if (isSelected) return 'bg-purple-500';
    
    switch (index % 4) {
      case 0: return 'bg-gray-700';
      case 1: return 'bg-gray-700';
      case 2: return 'bg-gray-700';
      case 3: return 'bg-gray-700';
      default: return 'bg-gray-700';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(version);
    }
  };

  return (
    <div 
      className={`${getCardBgColor()} p-6 rounded-lg cursor-pointer transition-all duration-200 hover:opacity-90 flex-shrink-0 min-w-[200px]`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-semibold text-white">
          {version.commit_message}
        </h4>
        <span className="text-2xl font-bold text-white">{version.version_number}</span>
      </div>
      <p className="text-gray-300 text-sm mb-1">{version.created_by_user?.username}</p>
      <p className="text-gray-400 text-xs">{version.created_at}</p>
    </div>
  );
};

export default VersionCard; 