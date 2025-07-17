import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { Stage } from '../types/api';
import StageCard2 from './StageCard2';

interface StageHistoryProps {
  stages: Stage[];
  onStageSelect?: (stage: Stage) => void;
  onOpenStageClick?: () => void;
  disableStageOpening?: boolean;
  isActiveStage?: boolean;
}

const StageHistory2: React.FC<StageHistoryProps> = ({ 
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full"></div>
        <h3 className="text-2xl font-bold text-white">Stage History</h3>
        <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
          {sortedStages.length} {sortedStages.length === 1 ? 'stage' : 'stages'}
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Timeline scrollable area */}
        <div className="overflow-x-auto scrollbar-hide" ref={scrollRef}>
          <div className="relative flex items-center gap-6 pb-6 min-w-max px-4">
            {/* Timeline line background */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-700 z-0"></div>
            
            {sortedStages.map((stage, index) => (
              <div key={stage.id} className="relative flex flex-col items-center z-10">
                {/* Timeline dot */}
                <div className={`
                  w-4 h-4 rounded-full border-2 mb-4 z-20 transition-all duration-300
                  ${stage.status === 'active' 
                    ? 'bg-green-400 border-green-400 shadow-lg shadow-green-400/50' 
                    : stage.status === 'approve'
                    ? 'bg-blue-400 border-blue-400'
                    : stage.status === 'reject'
                    ? 'bg-red-400 border-red-400'
                    : 'bg-gray-600 border-gray-600'
                  }
                  ${selectedStage?.id === stage.id ? 'scale-125' : 'scale-100'}
                `}></div>

                {/* Stage card */}
                <StageCard2
                  id={`stage-card-${stage.id}`}
                  stage={stage}
                  index={index}
                  isSelected={selectedStage?.id === stage.id}
                  isActive={stage.status === 'active'}
                  onClick={handleStageClick}
                />

                {/* Connection arrow (only between stages, not before the last one) */}
                {index < sortedStages.length - 1 && (
                  <div className="absolute top-6 -right-3 z-30">
                    <ArrowRight 
                      size={16} 
                      className="text-gray-600 bg-[#2a2a2a] rounded-full p-1" 
                    />
                  </div>
                )}
              </div>
            ))}
            
            {/* Open Stage Card */}
            {!disableStageOpening && !isActiveStage && (
              <div className="relative flex flex-col items-center z-10">
                {/* Timeline dot for new stage */}
                <div className="w-4 h-4 rounded-full border-2 border-dashed border-purple-400 mb-4 z-20 animate-pulse"></div>
                
                {/* Open stage button */}
                <div 
                  className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:from-purple-500 hover:to-purple-700 transition-all duration-300 hover:scale-105 flex-shrink-0 min-w-[280px] shadow-lg hover:shadow-purple-500/30 border border-purple-500/30"
                  onClick={onOpenStageClick}
                >
                  <div className="text-white text-lg font-bold mb-3">새 스테이지 열기</div>
                  <div className="bg-white/20 p-3 rounded-full mb-2">
                    <Plus size={24} className="text-white" />
                  </div>
                  <div className="text-purple-200 text-sm text-center">
                    다음 버전을 시작하세요
                  </div>
                </div>

                {/* Connection arrow from last stage */}
                {sortedStages.length > 0 && (
                  <div className="absolute top-6 -left-3 z-30">
                    <ArrowRight 
                      size={16} 
                      className="text-purple-500 bg-[#2a2a2a] rounded-full p-1" 
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        {sortedStages.length > 2 && (
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-[#2a2a2a] to-transparent w-16 h-full flex items-center justify-end pr-2">
            <div className="text-gray-500 text-sm animate-pulse">스크롤 →</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StageHistory2; 