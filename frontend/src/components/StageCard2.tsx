import React from 'react';
import { Stage } from '../types/api';

interface StageCardProps {
  stage: Stage;
  isSelected?: boolean;
  onClick?: (stage: Stage) => void;
  index: number;
  id?: string;
  isActive?: boolean;
}

const StageCard2: React.FC<StageCardProps> = ({ stage, isSelected, onClick, index, id, isActive }) => {
  const getCardClasses = () => {
    let baseClasses = 'group relative bg-[#1a1a1a] border rounded-xl cursor-pointer transition-all duration-300 hover:scale-102 flex-shrink-0 min-w-[280px] shadow-lg hover:shadow-xl';
    
    if (isSelected) {
      return `${baseClasses} border-purple-400 shadow-purple-400/30 transform scale-105`;
    }
    if (isActive) {
      return `${baseClasses} border-green-400 shadow-green-400/30 transform scale-105`;
    }
    return `${baseClasses} border-gray-600 hover:border-gray-500`;
  };

  const getHeaderClasses = () => {
    if (isSelected) {
      return 'bg-purple-500 text-white';
    }
    if (isActive) {
      return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    }
    return 'bg-gray-800 text-gray-200';
  };

  const getStatusColor = () => {
    switch (stage.status) {
      case 'active':
        return 'text-green-400 bg-green-400/10';
      case 'approve':
        return 'text-blue-400 bg-blue-400/10';
      case 'reject':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(stage);
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('ko-KR', { 
      year: '2-digit', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\./g, '.').replace(/\.$/, '');
  };

  console.log('StageCard stage:', stage);

  return (
    <div
      id={id}
      className={getCardClasses()}
      onClick={handleClick}
    >
      {/* Header Section */}
      <div className={`px-4 py-3 rounded-t-xl ${getHeaderClasses()}`}>
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg">
            Version {stage.version}
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {stage.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="text-white font-semibold text-base">
          {stage.title}
        </div>

        {/* Description */}
        <div className="text-gray-300 text-sm leading-relaxed line-clamp-3 min-h-[3.75rem]">
          {stage.description || 'No description provided'}
        </div>

        {/* Metadata */}
        <div className="pt-2 border-t border-gray-700 space-y-1">
          <div className="flex items-center text-xs text-gray-400">
            <span className="font-medium text-gray-300">{stage.user.username}</span>
            <span className="mx-2">•</span>
            <span>{formatDate(stage.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full"></div>
      )}
    </div>
  );
};

export default StageCard2; 