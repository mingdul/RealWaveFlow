import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Stage } from '../types/api';
import StageCard from './StageCard';

interface StageHistoryProps {
  stages: Stage[];
  onStageSelect?: (stage: Stage) => void;
  onOpenStageClick?: () => void;
  disableStageOpening?: boolean;
  isActiveStage?: boolean;
}

const StageHistory: React.FC<StageHistoryProps> = ({ 
  stages, 
  onStageSelect, 
  onOpenStageClick,
  disableStageOpening = false,
  isActiveStage = false
}) => {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
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

  const handleStageClick = (stage: Stage) => {
    setSelectedStage(stage);
    if (onStageSelect) {
      onStageSelect(stage);
    }

    // Find and scroll the clicked card to center
    const cardElement = document.getElementById(`stage-card-${stage.id}`);
    if (cardElement) {
      scrollToCenter(cardElement);
    }
  };

  // 버전 순으로 정렬
  const sortedStages = [...stages].sort((a, b) => a.version - b.version);

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-6">Stage History</h3>
      <div className="overflow-x-auto scrollbar-hide" ref={scrollRef}>
        <div className="flex gap-4 pb-4">
          {sortedStages.map((stage, index) => (
            <StageCard
              key={stage.id}
              id={`stage-card-${stage.id}`}
              stage={stage}
              index={index}
              isSelected={selectedStage?.id === stage.id}
              onClick={handleStageClick}
            />
          ))}
          
          {/* Open Stage Card */}
          {!disableStageOpening && !isActiveStage && (
            <div 
              className="bg-purple-800 p-6 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors flex-shrink-0 min-w-[200px]"
              onClick={onOpenStageClick}
            >
              <div className="text-white text-2xl font-bold mb-2">OPEN STAGE</div>
              <Plus size={32} className="text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StageHistory; 