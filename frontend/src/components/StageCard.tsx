import React from 'react';
import { Stage } from '../types/api';

interface StageCardProps {
  stage: Stage;
  isSelected?: boolean;
  onClick?: (stage: Stage) => void;
  index: number;
  id?: string;
}

const StageCard: React.FC<StageCardProps> = ({ stage, isSelected, onClick, index, id }) => {
  const getCardBgColor = () => {
    if (isSelected) return 'bg-purple-500 scale-105';
    
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
      onClick(stage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', { 
      year: '2-digit', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\./g, '.').replace(/\.$/, '');
  };

  return (
    <div
      id={id}
      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 hover:scale-102 flex-shrink-0 min-w-[200px] ${getCardBgColor()}`}
      onClick={handleClick}
    >
      <div className="text-white text-lg font-bold mb-2">
        V{stage.version}
      </div>
      <div className="text-gray-300 text-sm mb-2">
        {stage.title}
      </div>
      <div className="text-gray-400 text-xs mb-2 line-clamp-2">
        {stage.description}
      </div>
      <div className="text-gray-500 text-xs">
        {stage.user.username} • {formatDate(stage.created_at)}
      </div>
      <div className="text-gray-500 text-xs mt-1">
        Status: {stage.status}
      </div>
    </div>
  );
};

export default StageCard; 