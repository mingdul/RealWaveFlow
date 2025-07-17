import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayCircle, 
  Pause, 
  CheckCircle, 
  Clock, 
  GitBranch,
  User,
  Calendar,
  ArrowRight,
  Star,
  Activity,
  Zap,
  Plus
} from 'lucide-react';
import { Stage } from '../types/api';

interface StageHisProps {
  stages: Stage[];
  onStageSelect?: (stage: Stage) => void;
  onOpenStageClick?: () => void;
  disableStageOpening?: boolean;
  isActiveStage?: boolean;
}

const StageHis: React.FC<StageHisProps> = ({ 
  stages, 
  onStageSelect, 
  onOpenStageClick,
  disableStageOpening = false,
  isActiveStage = false
}) => {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [playingStage, setPlayingStage] = useState<string | null>(null);
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'from-blue-500 to-cyan-500',
          bgColor: 'bg-blue-500/10',
          textColor: 'text-blue-400',
          icon: <Activity className="w-4 h-4" />,
          label: 'Active'
        };
      case 'approve':
        return {
          color: 'from-green-500 to-emerald-500',
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-400',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Approved'
        };
      case 'pending':
        return {
          color: 'from-yellow-500 to-orange-500',
          bgColor: 'bg-yellow-500/10',
          textColor: 'text-yellow-400',
          icon: <Clock className="w-4 h-4" />,
          label: 'Pending'
        };
      default:
        return {
          color: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-500/10',
          textColor: 'text-gray-400',
          icon: <Clock className="w-4 h-4" />,
          label: 'Unknown'
        };
    }
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

    if (stage.status !== 'active') {
      setPlayingStage(playingStage === stage.id ? null : stage.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 버전 순으로 정렬
  const sortedStages = [...stages].sort((a, b) => a.version - b.version);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Stage History</h2>
            <p className="text-gray-400 text-sm">Track your creative journey</p>
          </div>
        </div>
        
        {!disableStageOpening && !isActiveStage && (
          <button
            onClick={onOpenStageClick}
            className="group relative px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium text-white shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>New Stage</span>
            </div>
            <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        )}
      </div>

      {/* 가로 스크롤 버전 카드 */}
      <div className="overflow-x-auto scrollbar-hide" ref={scrollRef}>
        <div className="flex gap-4 pb-4">
          {sortedStages.map((stage, _index) => {
            const statusConfig = getStatusConfig(stage.status);
            const isSelected = selectedStage?.id === stage.id;
            const isPlaying = playingStage === stage.id;
            
            return (
              <div
                key={stage.id}
                id={`stage-card-${stage.id}`}
                className={`
                  group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer flex-shrink-0 min-w-[280px]
                  ${isSelected 
                    ? 'border-purple-400 shadow-lg shadow-purple-500/25 scale-105' 
                    : 'border-white/10 hover:border-white/20'
                  }
                  ${stage.status === 'active' 
                    ? 'bg-gradient-to-br from-blue-900/20 to-purple-900/20' 
                    : 'bg-white/5'
                  }
                  backdrop-blur-sm hover:bg-white/10 hover:scale-[1.02]
                `}
                onClick={() => handleStageClick(stage)}
              >
                {/* 상태 표시 그라데이션 바 */}
                <div className={`h-1 bg-gradient-to-r ${statusConfig.color}`} />
                
                <div className="p-6 space-y-4">
                  {/* 헤더 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                        {statusConfig.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">
                          Version {stage.version}
                        </h3>
                        <p className={`text-xs ${statusConfig.textColor} font-medium`}>
                          {statusConfig.label}
                        </p>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="p-1 rounded-full bg-purple-500">
                        <Star className="w-3 h-3 text-white fill-current" />
                      </div>
                    )}
                  </div>

                  {/* 제목과 설명 */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-white group-hover:text-purple-300 transition-colors">
                      {stage.title}
                    </h4>
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {stage.description}
                    </p>
                  </div>

                  {/* 메타데이터 */}
                  <div className="space-y-2 text-xs text-gray-400">
                    <div className="flex items-center space-x-2">
                      <User className="w-3 h-3" />
                      <span>{stage.user?.username || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(stage.created_at.toString())}</span>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      {stage.status === 'active' ? (
                        <div className="flex items-center space-x-1 text-blue-400">
                          <Activity className="w-4 h-4" />
                          <span className="text-xs font-medium">Continue</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayingStage(isPlaying ? null : stage.id);
                          }}
                          className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <PlayCircle className="w-4 h-4" />
                          )}
                          <span className="text-xs font-medium">
                            {isPlaying ? 'Pause' : 'Preview'}
                          </span>
                        </button>
                      )}
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                {/* 호버 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* 선택된 상태 표시 */}
                {isSelected && (
                  <div className="absolute inset-0 bg-purple-500/5 border-2 border-purple-400/50 rounded-2xl" />
                )}
              </div>
            );
          })}
          
          {/* Open Stage Card */}
          {!disableStageOpening && !isActiveStage && (
            <div 
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-800/20 to-pink-800/20 backdrop-blur-sm hover:bg-gradient-to-br hover:from-purple-700/30 hover:to-pink-700/30 transition-all duration-300 cursor-pointer flex-shrink-0 min-w-[280px] hover:scale-[1.02]"
              onClick={onOpenStageClick}
            >
              <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
              
              <div className="p-6 h-full flex flex-col items-center justify-center space-y-4">
                <div className="p-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-white">OPEN STAGE</h3>
                  <p className="text-gray-400 text-sm">Start a new creative phase</p>
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  Click to create new stage
                </div>
              </div>
              
              {/* 호버 효과 */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          )}
        </div>
      </div>

      {/* 빈 상태 */}
      {stages.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 p-4 rounded-full bg-gray-700/50">
            <GitBranch className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No versions yet</h3>
          <p className="text-gray-500 mb-6">Create your first stage to get started</p>
          <button
            onClick={onOpenStageClick}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium text-white shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105"
          >
            Create First Stage
          </button>
        </div>
      )}
    </div>
  );
};

export default StageHis;