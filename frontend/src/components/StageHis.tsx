import React, { useState, useRef, useEffect } from 'react';
import { 
  Pause, 
  CheckCircle, 
  Clock, 
  User,
  Calendar,
  Star,
  Activity,
  Plus,
  ChevronLeft,
  ChevronRight,
  Play,
  List
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  onPlay?: (stageId: string) => void;
  onShowAllStems?: (stageId: string) => void;
  currentPlayingId?: string | null; // 현재 재생 중인 스테이지 ID
}

const StageHis: React.FC<StageHisProps> = ({ 
  stages, 
  onStageSelect: _, // TrackInfo와 분리되어 사용하지 않음
  onOpenStageClick,
  disableStageOpening = false,
  isActiveStage = false,
  selectedVersion,
  onPlay,
  onShowAllStems,
  currentPlayingId
}) => {
  const navigate = useNavigate();
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [userHasManuallySelected, setUserHasManuallySelected] = useState(false); // 사용자 수동 선택 추적
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

  // Ctrl + 스크롤 제어 함수
  const handleWheel = (e: React.WheelEvent) => {
    // Ctrl 키가 눌려있지 않으면 스크롤 막기
    if (!e.ctrlKey) {
      e.preventDefault();
      return;
    }
    // Ctrl 키가 눌려있으면 기본 스크롤 동작 허용
  };

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const onWheel = (e: WheelEvent) => {
      // Ctrl 키가 눌려있을 때만 수평 스크롤 처리
      if (e.ctrlKey && e.deltaY !== 0) {
        e.preventDefault();
        scrollEl.scrollLeft += e.deltaY;
        updateScrollButtons();
      }
      // Ctrl 키가 안 눌려있으면 기본 스크롤 동작(위아래 페이지 스크롤) 허용
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
    console.log('[DEBUG][StageHis] User manually selected stage:', stage.version);
    
    // Active 스테이지인 경우 Stage 페이지로 즉시 이동
    if (stage.status === 'active') {
      console.log('[DEBUG][StageHis] Navigating to active stage:', stage.id);
      navigate(`/stage/${stage.id}`);
      return;
    }
    
    // Active가 아닌 경우 선택 상태만 변경
    setSelectedStage(stage);
    setUserHasManuallySelected(true); // 사용자가 직접 선택했음을 표시
    // TrackInfo와 분리: onStageSelect 호출 제거
    // 카드 클릭 시에는 StageHis 내부 상태만 변경
  };

  // Play 버튼 클릭 핸들러
  const handlePlayClick = (stageId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // 카드 클릭 이벤트 방지
    }
    console.log('[DEBUG][StageHis] Play button clicked for stage:', stageId);
    
    // 1. 해당 스테이지를 자동으로 선택
    const targetStage = stages.find(stage => stage.id === stageId);
    if (targetStage) {
      setSelectedStage(targetStage);
      setUserHasManuallySelected(true);
      console.log('[DEBUG][StageHis] Auto-selected stage for play:', targetStage.version);
    }
    
    // 2. Play 함수 실행
    if (onPlay) {
      console.log('[DEBUG][StageHis] Calling onPlay with stageId:', stageId);
      onPlay(stageId);
    } else {
      console.warn('[WARN][StageHis] onPlay prop not provided');
    }
  };

  // Show All Stems 버튼 클릭 핸들러
  const handleShowAllStemsClick = (stageId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // 카드 클릭 이벤트 방지
    }
    
    console.log('[DEBUG][StageHis] === Show All Stems 버튼 클릭 ===');
    console.log('[DEBUG][StageHis] Target stageId:', stageId);
    
    // 1. 해당 스테이지를 자동으로 선택
    const targetStage = stages.find(stage => stage.id === stageId);
    if (targetStage) {
      setSelectedStage(targetStage);
      setUserHasManuallySelected(true);
      console.log('[DEBUG][StageHis] Auto-selected stage for stems - Version:', targetStage.version, 'Status:', targetStage.status);
    } else {
      console.error('[ERROR][StageHis] Target stage not found in stages list:', stageId);
      return;
    }
    
    // 2. Show All Stems 함수 실행 (해당 stageId의 stems만 조회)
    if (onShowAllStems) {
      console.log('[DEBUG][StageHis] 🎯 Calling onShowAllStems with SPECIFIC stageId:', stageId);
      console.log('[DEBUG][StageHis] 📋 Should load stems ONLY for Stage Version:', targetStage.version);
      onShowAllStems(stageId);
    } else {
      console.error('[ERROR][StageHis] onShowAllStems prop not provided - cannot load stage-specific stems');
    }
  };

  // 초기 렌더링 시 최신 승인된 스테이지 자동 선택 및 스크롤 (사용자가 직접 선택하지 않은 경우에만)
  useEffect(() => {
    if (stages.length > 0 && !selectedStage && !userHasManuallySelected) {
      // 1. 승인된 스테이지들 필터링
      const approvedStages = stages.filter(
        stage => stage.status === 'approved' || stage.status === 'APPROVED' || stage.status === 'approve'
      );

      let targetStage;
      if (approvedStages.length > 0) {
        // 승인된 스테이지 중 가장 높은 버전 선택
        targetStage = approvedStages.reduce((prev, current) =>
          current.version > prev.version ? current : prev
        );
        console.log('[DEBUG][StageHis] Auto-selected latest approved stage:', targetStage.version);
      } else {
        // 승인된 스테이지가 없으면 전체 중 최신 선택
        const sortedStagesByVersion = [...stages].sort((a, b) => b.version - a.version);
        targetStage = sortedStagesByVersion[0];
        console.log('[DEBUG][StageHis] No approved stages, auto-selected latest stage:', targetStage.version);
      }

      setSelectedStage(targetStage);

      // 2. 선택된 스테이지 카드로 자동 스크롤 (DOM 렌더링 완료 후)
      setTimeout(() => {
        const cardElement = document.getElementById(`stage-card-${targetStage.id}`);
        if (cardElement && scrollRef.current) {
          console.log('[DEBUG][StageHis] Found target card element for scrolling:', targetStage.version);
          
          // 스크롤 컨테이너 중앙에 카드가 보이도록 스크롤
          cardElement.scrollIntoView({ 
            behavior: 'smooth', 
            inline: 'center',  // 중앙 정렬로 변경
            block: 'nearest'
          });
          
          console.log('[DEBUG][StageHis] Auto-scrolled to approved stage card (center):', targetStage.version);
        } else {
          console.warn('[WARN][StageHis] Card element or scroll container not found for auto-scroll');
        }
      }, 200);  // 지연 시간을 200ms로 증가 (더 안정적인 DOM 렌더링 대기)
    }
  }, [stages, selectedStage, userHasManuallySelected]);

  // 외부에서 전달받은 selectedVersion에 따라 스테이지 선택 (사용자가 직접 선택하지 않은 경우에만)
  useEffect(() => {
    if (selectedVersion && stages.length > 0 && !userHasManuallySelected) {
      const targetStage = stages.find(stage => stage.version === selectedVersion);
      if (targetStage && targetStage.id !== selectedStage?.id) {
        setSelectedStage(targetStage);
        console.log('[DEBUG][StageHis] Auto-selected stage based on selectedVersion:', targetStage);
      }
    }
  }, [selectedVersion, stages, selectedStage?.id, userHasManuallySelected]);

  // Center the selected stage card after state updates so layout is stable
  useEffect(() => {
    if (!selectedStage) return;

    // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 스크롤
    const timeoutId = setTimeout(() => {
      const cardElement = document.getElementById(`stage-card-${selectedStage.id}`);
      if (cardElement && scrollRef.current) {
        // 선택된 카드를 중앙으로 스크롤
        cardElement.scrollIntoView({ 
          behavior: 'smooth', 
          inline: 'center',
          block: 'nearest'
        });
        console.log('[DEBUG][StageHis] Manually selected stage - scrolled to center for version:', selectedStage.version);
      } else {
        console.warn('[WARN][StageHis] Card element or scroll container not found for manual selection scroll');
      }
    }, 150);

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
    <div className="space-y-6" data-section="stage-history">
      {/* 헤더 */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex flex-col space-y-2">
          <h2 className="text-2xl font-bold text-white">Version List</h2>
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
            <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
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
        <div 
          className="overflow-x-auto scrollbar-hide py-4 px-10" 
          ref={scrollRef}
          onWheel={handleWheel}
        >
          <div className="flex gap-x-16 pb-4 min-w-max">
            {sortedStages.map((stage) => {
              const statusConfig = getStatusConfig(stage.status);
              const isSelected = selectedStage?.id === stage.id;
              
              return (
                <div key={stage.id} className="relative">
                  {/* 메인 카드 */}
                  <div
                    id={`stage-card-${stage.id}`}
                    className={`
                      group relative overflow-hidden rounded-3xl transition-all duration-300 cursor-pointer flex-shrink-0 w-80 h-96
                      ${isSelected 
                        ? 'shadow-2xl shadow-blue-500/30 scale-105 ring-2 ring-blue-400/50'
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
                    {/* 상태 표시 인디케이터 - 선택된 카드는 파란색으로 하이라이트 */}
                    <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                      isSelected ? 'bg-blue-600' : statusConfig.dotColor
                    } shadow-lg`} />
                    
                    {/* 카드 내용 */}
                    <div className="p-6 h-full flex flex-col justify-between">
                      {/* 상단: 버전 정보 */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-3 rounded-2xl ${statusConfig.bgColor} shadow-lg`}>
                              {/* 버전 아이콘 제거됨 */}
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
                            <div className="p-2 rounded-full bg-blue-600 shadow-lg">
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
  
                        {/* 액션 버튼 - Active 스테이지가 아닐 때만 표시 */}
                        {stage.status !== 'active' && (
                          <div className="flex flex-col space-y-3 pt-3 border-t border-white/10">
                            {/* 첫 번째 줄: Play와 Show All Stems 버튼 */}
                            <div className="flex items-center space-x-3">
                            <Button
                              onClick={(e) => handlePlayClick(stage.id, e)}
                              variant="waveflowbtn2"
                              className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 ${
                                selectedStage && selectedStage.id === stage.id
                                  ? 'bg-purple-500/20 text-purple-300 hover:text-white hover:bg-purple-500/30'
                                  : 'bg-purple-500/10 text-purple-200 hover:text-white hover:bg-purple-500/20'
                              }`}
                            >
                              {currentPlayingId === stage.id ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">
                                {currentPlayingId === stage.id ? 'Pause' : 'Play'}
                              </span>
                            </Button>
                            
                            <Button
                              onClick={(e) => handleShowAllStemsClick(stage.id, e)}
                              variant="waveflowbtn2"
                              disabled={stage.status === 'active'}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 ${
                                stage.status === 'active'
                                  ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed opacity-50'
                                  : selectedStage && selectedStage.id === stage.id
                                    ? 'bg-green-500/20 text-green-300 hover:text-white hover:bg-green-500/30'
                                    : 'bg-green-500/10 text-green-200 hover:text-white hover:bg-green-500/20'
                              }`}
                            >
                              <List className="w-4 h-4" />
                              <span className="text-sm font-medium">Stems</span>
                            </Button>
                          </div>

                          {/* 두 번째 줄: 상태 표시와 버전 뱃지 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {stage.status === 'active' ? (
                                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                                  <Activity className="w-3 h-3" />
                                  <span className="text-xs font-medium">Active</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-500/20 text-gray-300">
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="text-xs font-medium">
                                    {stage.status === 'APPROVED' || stage.status === 'approve' ? 'Approved' : 'Completed'}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* 버전 뱃지 */}
                            <div className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300 font-medium">
                              v{stage.version}
                            </div>
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
  
                    {/* 호버 효과 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl pointer-events-none" />
                    
                    {/* 선택된 상태 글로우 효과 */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-3xl pointer-events-none" />
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
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl pointer-events-none" />
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