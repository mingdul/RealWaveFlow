import React, { useState, useRef, useEffect } from 'react';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollEl.scrollLeft += e.deltaY;
      }
    };
    scrollEl.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      scrollEl.removeEventListener('wheel', onWheel);
    };
  }, []);

  const scrollToCenter = (element: HTMLElement) => {
    const container = scrollRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const elementWidth = element.offsetWidth;
    const elementLeft = element.offsetLeft;
    
    const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  };

  const handleVersionClick = (version: Version) => {
    setSelectedVersion(version);
    if (onVersionSelect) {
      onVersionSelect(version);
    }

    // Find and scroll the clicked card to center
    const cardElement = document.getElementById(`version-card-${version.id}`);
    if (cardElement) {
      scrollToCenter(cardElement);
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-6">Version History</h3>
      <div className="overflow-x-auto scrollbar-hide" ref={scrollRef}>
        <div className="flex gap-4 pb-4">
          {versions.map((version, index) => (
            <VersionCard
              key={version.id}
              id={`version-card-${version.id}`}
              version={version}
              index={index}
              isSelected={selectedVersion?.id === version.id}
              onClick={() => handleVersionClick(version)}
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