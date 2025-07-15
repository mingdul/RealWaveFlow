import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
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
        <div className="flex items-center pb-4">
          {versions.map((version, index) => (
            <React.Fragment key={version.id}>
              <VersionCard
                id={`version-card-${version.id}`}
                version={version}
                index={index}
                isSelected={selectedVersion?.id === version.id}
                onClick={() => handleVersionClick(version)}
              />
              
              {/* Connection Arrow - shown after each version card except the last */}
              {index < versions.length - 1 && (
                <div className="flex items-center mx-4 flex-shrink-0">
                  <div className="flex items-center bg-gray-800/30 px-3 py-2 rounded-lg">
                    <div className="w-12 h-1.5 bg-gradient-to-r from-blue-400 to-blue-300 rounded-full shadow-lg"></div>
                    <ChevronRight size={20} className="text-blue-300 ml-2 drop-shadow-lg" />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
          
          {/* Final Connection to Open Stage */}
          {versions.length > 0 && (
            <div className="flex items-center mx-4 flex-shrink-0">
              <div className="flex items-center bg-gray-800/30 px-3 py-2 rounded-lg">
                <div className="w-12 h-1.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full shadow-lg"></div>
                <ChevronRight size={20} className="text-purple-400 ml-2 drop-shadow-lg" />
              </div>
            </div>
          )}
          
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