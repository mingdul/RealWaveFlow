import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { Stage } from '../types/api';
import StageCard from './StageCard';

interface StageHistoryProps {
  stages: Stage[];
  selectedStage: Stage | null;
  onStageSelect: (stage: Stage) => void;
  onOpenStageClick: () => void;
  disableStageOpening: boolean;
}

export const StageHistory: React.FC<StageHistoryProps> = ({ 
  stages, 
  selectedStage,
  onStageSelect, 
  onOpenStageClick,
  disableStageOpening
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stages should be sorted by version number in descending order
  const sortedStages = [...stages].sort((a, b) => b.version - a.version);

  const handleStageClick = (stage: Stage) => {
    if (onStageSelect) {
      onStageSelect(stage);
    }

    // Find and scroll the clicked card to center
    const cardElement = document.getElementById(`stage-card-${stage.id}`);
    if (cardElement && scrollRef.current) {
      const scrollContainer = scrollRef.current;
      const cardRect = cardElement.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const scrollLeft = scrollContainer.scrollLeft + cardRect.left - containerRect.left - (containerRect.width / 2) + (cardRect.width / 2);
      scrollContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

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