import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayCircle, 
  Pause, 
  CheckCircle, 
  Clock, 
  User,
  Calendar,
  Star,
  Activity,
  Plus,
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
          <div className="flex items-center space-x-2">
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
              <Plus className="w-4 h-4" />
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
  
        {/* 카드 그리드 레이아웃 */}
        <div className="overflow-x-auto scrollbar-hide py-4 px-10" ref={scrollRef}>
          <div className="flex gap-x-24 pb-4 min-w-max">
            {sortedStages.map((stage) => {
              const statusConfig = getStatusConfig(stage.status);
              const isSelected = selectedStage?.id === stage.id;
              const isPlaying = playingStage === stage.id;
              
              return (
                <div key={stage.id} className="relative">
                  {/* 메인 카드 */}
                  <div
                    id={`stage-card-${stage.id}`}
                    className={`
                      group relative overflow-hidden rounded-3xl transition-all duration-300 cursor-pointer flex-shrink-0 w-80 h-96
                      ${isSelected 
                        ? 'shadow-2xl shadow-purple-500/30 scale-105 ring-2 ring-purple-400/50'
                        : 'shadow-lg hover:shadow-xl hover:shadow-black/30'
                      }
                      ${stage.status === 'active' 
                        ? 'bg-gradient-to-br from-indigo-600/90 to-purple-600/90' 
                        : 'bg-gradient-to-br from-gray-800/90 to-gray-900/90'
                      }
                      backdrop-blur-sm hover:scale-[1.02] hover:-translate-y-1
                    `}
                    onClick={() => handleStageClick(stage)}
                    style={{
                      background: stage.status === 'active' 
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%)'
                        : 'linear-gradient(135deg, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 0.9) 100%)'
                    }}
                  >
                    {/* 상태 표시 인디케이터 */}
                    <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${statusConfig.dotColor} shadow-lg`} />
                    
                    {/* 카드 내용 */}
                    <div className="p-6 h-full flex flex-col justify-between">
                      {/* 상단: 버전 정보 */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-3 rounded-2xl ${statusConfig.bgColor} shadow-lg`}>
                              {statusConfig.icon}
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-white">
                                Version {stage.version}
                              </h3>
                              <p className={`text-sm ${statusConfig.textColor} font-medium`}>
                                {statusConfig.label}
                              </p>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="p-2 rounded-full bg-purple-500 shadow-lg">
                              <Star className="w-4 h-4 text-white fill-current" />
                            </div>
                          )}
                        </div>
  
                        {/* 설명 */}
                        <div className="space-y-2">
                          <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                            {stage.description}
                          </p>
                        </div>
                      </div>
  
                      {/* 하단: 메타데이터와 액션 */}
                      <div className="space-y-4">
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
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <div className="flex items-center space-x-2">
                            {stage.status === 'active' ? (
                              <div className="flex items-center space-x-2 px-3 py-2 rounded-full bg-blue-500/20 text-blue-300">
                                <Activity className="w-4 h-4" />
                                <span className="text-sm font-medium">Continue</span>
                              </div>
                            ) : (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlayingStage(isPlaying ? null : stage.id);
                                }}
                                variant="waveflowbtn2" 
                                className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-300"
                              >
                                {isPlaying ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <PlayCircle className="w-4 h-4" />
                                )}
                                <span className="text-sm font-medium">
                                  {isPlaying ? 'Pause' : 'Preview'}
                                </span>
                              </Button>
                            )}
                          </div>
                          
                          {/* 버전 뱃지 */}
                          <div className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300 font-medium">
                            v{stage.version}
                          </div>
                        </div>
                      </div>
                    </div>
  
                    {/* 호버 효과 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                    
                    {/* 선택된 상태 글로우 효과 */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl" />
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Open Stage Card */}
            {!disableStageOpening && !isActiveStage && (
              <div className="relative ml-6">
                <div 
                  className="group relative overflow-hidden rounded-3xl transition-all duration-300 cursor-pointer flex-shrink-0 w-80 h-96 bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm hover:from-purple-600/30 hover:to-pink-600/30 hover:scale-[1.02] hover:-translate-y-1 shadow-lg hover:shadow-xl border-2 border-dashed border-purple-400/30 hover:border-purple-400/50"
                  onClick={onOpenStageClick}
                >
                  <div className="h-full flex flex-col items-center justify-center space-y-6 p-6">
                    <div className="p-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-2xl">
                      <Plus className="w-12 h-12 text-white" />
                    </div>
                    
                    <div className="text-center space-y-3">
                      <h3 className="text-2xl font-bold text-white">OPEN STAGE</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">Start a new creative phase</p>
                    </div>
                    
                    <div className="px-4 py-2 bg-purple-500/20 rounded-full text-xs text-purple-300 font-medium">
                      v{sortedStages.length + 1}
                    </div>
                    
                    <div className="text-xs text-gray-500 text-center opacity-70">
                      Click to create new stage
                    </div>
                  </div>
                  
                  {/* 호버 효과 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  
      {/* 빈 상태 */}
      {stages.length === 0 && (
        <div className="text-center py-16">
          <h3 className="text-2xl font-bold text-gray-300 mb-3">No versions yet</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">Create your first stage to get started on your creative journey</p>
          <button
            onClick={onOpenStageClick}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl font-semibold text-white shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105"
          >
            Create First Stage
          </button>
        </div>
      )}
    </div>
  );

};

export default StageHis;