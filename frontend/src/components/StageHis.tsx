import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayCircle, 
  Pause, 
  CheckCircle, 
  Clock, 
  GitBranch,
  User,
  Calendar,

  Star,
  Activity,
  Zap,
  Plus,
  GitCommit,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
// import { ArrowRight } from 'lucide-react';
import { Stage } from '../types/api';
import Button from './Button';

interface StageHisProps {
  stages: Stage[];
  onStageSelect?: (stage: Stage) => void;
  onOpenStageClick?: () => void;
  disableStageOpening?: boolean;
  isActiveStage?: boolean;
  selectedVersion?: number; // 외부에서 선택된 버전을 받기 위한 prop
}

const StageHis: React.FC<StageHisProps> = ({ 
  stages, 
  onStageSelect, 
  onOpenStageClick,
  disableStageOpening = false,
  isActiveStage = false,
  selectedVersion
}) => {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [playingStage, setPlayingStage] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 스크롤 상태 업데이트
  const updateScrollButtons = () => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    setCanScrollLeft(scrollEl.scrollLeft > 0);
    setCanScrollRight(
      scrollEl.scrollLeft < scrollEl.scrollWidth - scrollEl.clientWidth
    );
  };

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollEl.scrollLeft += e.deltaY;
        updateScrollButtons();
      }
    };

    const onScroll = () => {
      updateScrollButtons();
    };

    scrollEl.addEventListener('wheel', onWheel, { passive: false });
    scrollEl.addEventListener('scroll', onScroll);
    
    // 초기 상태 설정
    updateScrollButtons();

    return () => {
      scrollEl.removeEventListener('wheel', onWheel);
      scrollEl.removeEventListener('scroll', onScroll);
    };
  }, [stages]);

  // 좌우 스크롤 함수
  const scrollLeft = () => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    
    scrollEl.scrollBy({
      left: -320, // 카드 너비 + 여백
      behavior: 'smooth'
    });
  };

  const scrollRight = () => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    
    scrollEl.scrollBy({
      left: 320, // 카드 너비 + 여백
      behavior: 'smooth'
    });
  };

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
          label: 'Active',
          dotColor: 'bg-blue-500'
        };
      case 'approve':
        return {
          color: 'from-green-500 to-emerald-500',
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-400',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Approved',
          dotColor: 'bg-green-500'
        };
    case 'APPROVED':
        return {
            color: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-500/10',
            textColor: 'text-green-400',
            icon: <CheckCircle className="w-4 h-4" />,
            label: 'Approved',
            dotColor: 'bg-green-500'
          };
      case 'pending':
        return {
          color: 'from-yellow-500 to-orange-500',
          bgColor: 'bg-yellow-500/10',
          textColor: 'text-yellow-400',
          icon: <Clock className="w-4 h-4" />,
          label: 'Pending',
          dotColor: 'bg-yellow-500'
        };
      default:
        return {
          color: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-500/10',
          textColor: 'text-gray-400',
          icon: <Clock className="w-4 h-4" />,
          label: 'Unknown',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const handleStageClick = (stage: Stage) => {
    setSelectedStage(stage);
    if (onStageSelect) {
      onStageSelect(stage);
    }

    // Removed direct scrollToCenter call here – it will be handled in useEffect

    if (stage.status !== 'active') {
      setPlayingStage(playingStage === stage.id ? null : stage.id);
    }
  };

  // 외부에서 전달받은 selectedVersion에 따라 스테이지 자동 선택
  useEffect(() => {
    if (selectedVersion && stages.length > 0) {
      const targetStage = stages.find(stage => stage.version === selectedVersion);
      if (targetStage && targetStage.id !== selectedStage?.id) {
        setSelectedStage(targetStage);
        console.log('[DEBUG][StageHis] Auto-selected stage based on selectedVersion:', targetStage);
      }
    }
  }, [selectedVersion, stages, selectedStage?.id]);

  // Center the selected stage card after state updates so layout is stable
  useEffect(() => {
    if (!selectedStage) return;

    // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 스크롤
    const timeoutId = setTimeout(() => {
      const cardElement = document.getElementById(`stage-card-${selectedStage.id}`);
      if (cardElement) {
        scrollToCenter(cardElement as HTMLElement);
        console.log('[DEBUG][StageHis] Scrolled to center for stage:', selectedStage.version);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedStage]);

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
            <h2 className="text-2xl font-bold text-white">Stage History</h2>
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

      {/* 타임라인 스타일 스테이지 히스토리 */}
      <div className="relative">
        {/* 좌측 스크롤 버튼 */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-30 bg-black/80 backdrop-blur-sm text-white p-3 rounded-full shadow-lg hover:bg-black/90 transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* 우측 스크롤 버튼 */}
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-30 bg-black/80 backdrop-blur-sm text-white p-3 rounded-full shadow-lg hover:bg-black/90 transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* 호버 시 잘림 방지를 위한 충분한 패딩 */}
        <div className="overflow-x-auto scrollbar-hide py-8 px-4" ref={scrollRef}>
          <div className="relative flex items-center gap-0 pb-4 min-w-max">
            {sortedStages.map((stage, index) => {
              const statusConfig = getStatusConfig(stage.status);
              const isSelected = selectedStage?.id === stage.id;
              const isPlaying = playingStage === stage.id;
              const isLast = index === sortedStages.length - 1;
              
              return (
                <div key={stage.id} className="relative flex items-center">
                  {/* 스테이지 카드 */}
                  <div className="relative z-10 flex flex-col items-center">
                    {/* 타임라인 도트 */}
                    <div className={`w-4 h-4 rounded-full ${statusConfig.dotColor} border-4 border-white shadow-lg z-20 mb-4`} />
                    
                    {/* 카드 */}
                    <div
                      id={`stage-card-${stage.id}`}
                      className={`
                        group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer flex-shrink-0 w-72
                        ${isSelected 
                          ? `border-${statusConfig.color} shadow-lg shadow-${statusConfig.color}/25 scale-105`
                          : 'border-white/10 hover:border-white/20'
                        }
                        ${stage.status === 'active' 
                          ? 'bg-gradient-to-br from-blue-900/20 to-purple-900/20' 
                          : 'bg-white/5'
                        }
                        backdrop-blur-sm hover:bg-white/10 hover:scale-[1.02] hover:-translate-y-1
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
                            <div className='flex items-center space-x-2'>
                              <h3 className="flex items-center font-semibold text-white text-2xl">
                                Version {stage.version}
                              </h3>
                              <p className={`flex items-center text-xs ${statusConfig.textColor} font-medium`}>
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

                        {/* 설명 */}
                        <div className="space-y-2">
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
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlayingStage(isPlaying ? null : stage.id);
                                }}
                                variant="waveflowbtn2" 
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
                              </Button>
                            )}
                          </div>
                          
                          {/* <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" /> */}
                        </div>
                      </div>

                      {/* 호버 효과 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* 선택된 상태 표시 */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-purple-500/5 border-2 border-purple-400/50 rounded-2xl" />
                      )}
                    </div>

                    {/* 버전 번호 표시 */}
                    <div className="mt-4 px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300 font-medium">
                      v{stage.version}
                    </div>
                  </div>

                  {/* 다음 스테이지와의 연결선 (마지막이 아닌 경우) */}
                  {!isLast && (
                    <div className="flex-1 flex items-center justify-center px-8">
                      <div className="flex items-center space-x-2 text-gray-500">
                        <div className="w-8 h-0.5 bg-gradient-to-r from-purple-500/50 to-blue-500/50" />
                        <GitCommit className="w-4 h-4 text-gray-400" />
                        <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500/50 to-purple-500/50" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Open Stage Card */}
            {!disableStageOpening && !isActiveStage && (
              <div className="relative flex items-center ml-8">
                {/* 연결선 */}
                {sortedStages.length > 0 && (
                  <div className="flex items-center justify-center pr-8">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-purple-500/50 to-pink-500/50" />
                      <Plus className="w-4 h-4 text-purple-400" />
                      <div className="w-8 h-0.5 bg-gradient-to-r from-pink-500/50 to-purple-500/50" />
                    </div>
                  </div>
                )}
                
                <div className="relative z-10 flex flex-col items-center">
                  {/* 플러스 도트 */}
                  <div className="w-4 h-4 rounded-full bg-purple-500 border-4 border-white shadow-lg z-20 mb-4 flex items-center justify-center">
                    <Plus className="w-2 h-2 text-white" />
                  </div>
                  
                  {/* 카드 */}
                  <div 
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-800/20 to-pink-800/20 backdrop-blur-sm hover:bg-gradient-to-br hover:from-purple-700/30 hover:to-pink-700/30 transition-all duration-300 cursor-pointer flex-shrink-0 w-72 hover:scale-[1.02] hover:-translate-y-1"
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

                  {/* 새로운 버전 표시 */}
                  <div className="mt-4 px-3 py-1 bg-purple-500/20 rounded-full text-xs text-purple-300 font-medium">
                    v{sortedStages.length + 1}
                  </div>
                </div>
              </div>
            )}
          </div>
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