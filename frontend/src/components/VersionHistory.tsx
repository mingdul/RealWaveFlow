import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Version } from '../types/api';
import VersionCard from './VersionCard';

interface VersionHistoryProps {
  versions: Version[];
  onVersionSelect?: (version: Version) => void;
  onOpenStageClick?: () => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ 
  versions, 
  onVersionSelect, 
  onOpenStageClick 
}) => {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  const handleVersionClick = (version: Version) => {
    setSelectedVersion(version);
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-6">Version History</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-4">
          {versions.map((version, index) => (
            <VersionCard
              key={version.id}
              version={version}
              index={index}
              isSelected={selectedVersion?.id === version.id}
              onClick={handleVersionClick}
            />
          ))}
          
          {/* Open Stage Card */}
          <div 
            className="bg-purple-800 p-6 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors flex-shrink-0 min-w-[200px]"
            onClick={onOpenStageClick}
          >
            <div className="text-white text-2xl font-bold mb-2">OPEN STAGE</div>
            <Plus size={32} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistory; 