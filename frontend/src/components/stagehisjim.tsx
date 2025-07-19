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
  ChevronRight,
} from 'lucide-react';
import { Stage } from '../types/api';
import Button from './Button';

interface StageHisProps {
  stages: Stage[];
  onStageSelect?: (stage: Stage) => void;
  onOpenStageClick?: () => void;
  disableStageOpening?: boolean;
  isActiveStage?: boolean;
}

const stagehisjim: React.FC<StageHisProps> = ({
  stages,
  onStageSelect,
  onOpenStageClick,
  disableStageOpening = false,
  isActiveStage = false,
}) => {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [playingStage, setPlayingStage] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Netflix 스타일 랭킹 SVG 컴포넌트
  const NetflixRankSVG: React.FC<{ version: number }> = ({ version }) => {
    const isDoubleDigit = version >= 10;
    const width = isDoubleDigit ? 140 : 81;
    const strokeWidth = 3;

    return (
      <div className='absolute -left-3 -top-3 z-20 h-24 w-16'>
        <svg
          width={width * 0.5}
          height='96'
          viewBox={`0 0 ${width} 154`}
          className='drop-shadow-2xl'
        >
          {/* Background stroke */}
          <text
            x='50%'
            y='50%'
            dominantBaseline='middle'
            textAnchor='middle'
            className='fill-none stroke-black'
            strokeWidth={strokeWidth + 2}
            style={{
              fontSize: isDoubleDigit ? '70px' : '80px',
              fontWeight: 900,
              fontFamily: 'Arial Black, sans-serif',
            }}
          >
            {version}
          </text>

          {/* White stroke */}
          <text
            x='50%'
            y='50%'
            dominantBaseline='middle'
            textAnchor='middle'
            className='fill-none stroke-white'
            strokeWidth={strokeWidth}
            style={{
              fontSize: isDoubleDigit ? '70px' : '80px',
              fontWeight: 900,
              fontFamily: 'Arial Black, sans-serif',
            }}
          >
            {version}
          </text>

          {/* Main fill with gradient */}
          <defs>
            <linearGradient
              id={`versionGradient${version}`}
              x1='0%'
              y1='0%'
              x2='0%'
              y2='100%'
            >
              <stop offset='0%' stopColor='#a855f7' />
              <stop offset='50%' stopColor='#8b5cf6' />
              <stop offset='100%' stopColor='#7c3aed' />
            </linearGradient>
          </defs>

          <text
            x='50%'
            y='50%'
            dominantBaseline='middle'
            textAnchor='middle'
            fill={`url(#versionGradient${version})`}
            style={{
              fontSize: isDoubleDigit ? '70px' : '80px',
              fontWeight: 900,
              fontFamily: 'Arial Black, sans-serif',
            }}
          >
            {version}
          </text>
        </svg>
      </div>
    );
  };

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
      behavior: 'smooth',
    });
  };

  const scrollRight = () => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    scrollEl.scrollBy({
      left: 320, // 카드 너비 + 여백
      behavior: 'smooth',
    });
  };

  const scrollToCenter = (element: HTMLElement) => {
    const container = scrollRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const elementWidth = element.offsetWidth;
    const elementLeft = element.offsetLeft;

    const scrollPosition = elementLeft - containerWidth / 2 + elementWidth / 2;
    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'from-blue-500 to-cyan-500',
          bgColor: 'bg-blue-500/10',
          textColor: 'text-blue-400',
          icon: <Activity className='h-4 w-4' />,
          label: 'Active',
          dotColor: 'bg-blue-500',
        };
      case 'approve':
        return {
          color: 'from-green-500 to-emerald-500',
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-400',
          icon: <CheckCircle className='h-4 w-4' />,
          label: 'Approved',
          dotColor: 'bg-green-500',
        };
      case 'APPROVED':
        return {
          color: 'from-green-500 to-emerald-500',
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-400',
          icon: <CheckCircle className='h-4 w-4' />,
          label: 'Approved',
          dotColor: 'bg-green-500',
        };
      case 'pending':
        return {
          color: 'from-yellow-500 to-orange-500',
          bgColor: 'bg-yellow-500/10',
          textColor: 'text-yellow-400',
          icon: <Clock className='h-4 w-4' />,
          label: 'Pending',
          dotColor: 'bg-yellow-500',
        };
      default:
        return {
          color: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-500/10',
          textColor: 'text-gray-400',
          icon: <Clock className='h-4 w-4' />,
          label: 'Unknown',
          dotColor: 'bg-gray-500',
        };
    }
  };

  const handleStageClick = (stage: Stage) => {
    setSelectedStage(stage);
    if (onStageSelect) {
      onStageSelect(stage);
    }

    if (stage.status !== 'active') {
      setPlayingStage(playingStage === stage.id ? null : stage.id);
    }
  };

  // Center the selected stage card after state updates so layout is stable
  useEffect(() => {
    if (!selectedStage) return;

    const cardElement = document.getElementById(
      `stage-card-${selectedStage.id}`
    );
    if (cardElement) {
      scrollToCenter(cardElement as HTMLElement);
    }
  }, [selectedStage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 버전 순으로 정렬
  const sortedStages = [...stages].sort((a, b) => a.version - b.version);

  return (
    <div className='space-y-6'>
      {/* 헤더 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <div className='rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-2'>
            <GitBranch className='h-5 w-5 text-white' />
          </div>
          <div>
            <h2 className='text-2xl font-bold text-white'>Stage History</h2>
            <p className='text-sm text-gray-400'>Track your creative journey</p>
          </div>
        </div>

        {!disableStageOpening && !isActiveStage && (
          <button
            onClick={onOpenStageClick}
            className='group relative rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-purple-500/25'
          >
            <div className='flex items-center space-x-2'>
              <Zap className='h-4 w-4' />
              <span>New Stage</span>
            </div>
            <div className='absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
          </button>
        )}
      </div>

      {/* 타임라인 스타일 스테이지 히스토리 */}
      <div className='relative'>
        {/* 좌측 스크롤 버튼 */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className='absolute left-0 top-1/2 z-30 -translate-y-1/2 transform rounded-full bg-black/80 p-3 text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-black/90'
          >
            <ChevronLeft className='h-5 w-5' />
          </button>
        )}

        {/* 우측 스크롤 버튼 */}
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className='absolute right-0 top-1/2 z-30 -translate-y-1/2 transform rounded-full bg-black/80 p-3 text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-black/90'
          >
            <ChevronRight className='h-5 w-5' />
          </button>
        )}

        {/* 호버 시 잘림 방지를 위한 충분한 패딩 */}
        <div
          className='overflow-x-auto px-4 py-8 scrollbar-hide'
          ref={scrollRef}
        >
          <div className='relative flex min-w-max items-center gap-0 pb-4'>
            {sortedStages.map((stage, index) => {
              const statusConfig = getStatusConfig(stage.status);
              const isSelected = selectedStage?.id === stage.id;
              const isPlaying = playingStage === stage.id;
              const isLast = index === sortedStages.length - 1;

              return (
                <div key={stage.id} className='relative flex items-center'>
                  {/* 스테이지 카드 */}
                  <div className='relative z-10 flex flex-col items-center'>
                    {/* 타임라인 도트 */}
                    <div
                      className={`h-4 w-4 rounded-full ${statusConfig.dotColor} z-20 mb-4 border-4 border-white shadow-lg`}
                    />

                    {/* 카드 */}
                    <div
                      id={`stage-card-${stage.id}`}
                      className={`group relative w-72 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 ${
                        isSelected
                          ? `scale-105 border-purple-400 shadow-lg shadow-purple-500/25`
                          : 'border-white/10 hover:border-white/20'
                      } ${
                        stage.status === 'active'
                          ? 'bg-gradient-to-br from-blue-900/20 to-purple-900/20'
                          : 'bg-white/5'
                      } backdrop-blur-sm hover:-translate-y-1 hover:scale-[1.02] hover:bg-white/10`}
                      onClick={() => handleStageClick(stage)}
                    >
                      {/* Netflix 스타일 버전 랭킹 */}
                      <NetflixRankSVG version={stage.version} />

                      {/* 상태 표시 그라데이션 바 */}
                      <div
                        className={`h-1 bg-gradient-to-r ${statusConfig.color}`}
                      />

                      <div className='space-y-4 p-6 pt-8'>
                        {' '}
                        {/* Netflix 랭킹을 위한 상단 여백 추가 */}
                        {/* 헤더 */}
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center space-x-3'>
                            <div
                              className={`rounded-lg p-2 ${statusConfig.bgColor}`}
                            >
                              {statusConfig.icon}
                            </div>
                            <div className='flex items-center space-x-2'>
                              <h3 className='flex items-center text-2xl font-semibold text-white'>
                                Version {stage.version}
                              </h3>
                              <p
                                className={`flex items-center text-xs ${statusConfig.textColor} font-medium`}
                              >
                                {statusConfig.label}
                              </p>
                            </div>
                          </div>

                          {isSelected && (
                            <div className='rounded-full bg-purple-500 p-1'>
                              <Star className='h-3 w-3 fill-current text-white' />
                            </div>
                          )}
                        </div>
                        {/* 설명 */}
                        <div className='space-y-2'>
                          <p className='line-clamp-2 text-sm text-gray-400'>
                            {stage.description}
                          </p>
                        </div>
                        {/* 메타데이터 */}
                        <div className='space-y-2 text-xs text-gray-400'>
                          <div className='flex items-center space-x-2'>
                            <User className='h-3 w-3' />
                            <span>{stage.user?.username || 'Unknown'}</span>
                          </div>
                          <div className='flex items-center space-x-2'>
                            <Calendar className='h-3 w-3' />
                            <span>
                              {formatDate(stage.created_at.toString())}
                            </span>
                          </div>
                        </div>
                        {/* 액션 버튼 */}
                        <div className='flex items-center justify-between pt-2'>
                          <div className='flex items-center space-x-2'>
                            {stage.status === 'active' ? (
                              <div className='flex items-center space-x-1 text-blue-400'>
                                <Activity className='h-4 w-4' />
                                <span className='text-xs font-medium'>
                                  Continue
                                </span>
                              </div>
                            ) : (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlayingStage(isPlaying ? null : stage.id);
                                }}
                                variant='waveflowbtn2'
                                className='flex items-center space-x-1 text-gray-400 transition-colors hover:text-white'
                              >
                                {isPlaying ? (
                                  <Pause className='h-4 w-4' />
                                ) : (
                                  <PlayCircle className='h-4 w-4' />
                                )}
                                <span className='text-xs font-medium'>
                                  {isPlaying ? 'Pause' : 'Preview'}
                                </span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 호버 효과 */}
                      <div className='absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100' />

                      {/* 선택된 상태 표시 */}
                      {isSelected && (
                        <div className='absolute inset-0 rounded-2xl border-2 border-purple-400/50 bg-purple-500/5' />
                      )}
                    </div>

                    {/* 버전 번호 표시 (하단의 작은 표시는 제거 - Netflix 스타일 랭킹이 있으므로) */}
                  </div>

                  {/* 다음 스테이지와의 연결선 (마지막이 아닌 경우) */}
                  {!isLast && (
                    <div className='flex flex-1 items-center justify-center px-8'>
                      <div className='flex items-center space-x-2 text-gray-500'>
                        <div className='h-0.5 w-8 bg-gradient-to-r from-purple-500/50 to-blue-500/50' />
                        <GitCommit className='h-4 w-4 text-gray-400' />
                        <div className='h-0.5 w-8 bg-gradient-to-r from-blue-500/50 to-purple-500/50' />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Open Stage Card */}
            {!disableStageOpening && !isActiveStage && (
              <div className='relative ml-8 flex items-center'>
                {/* 연결선 */}
                {sortedStages.length > 0 && (
                  <div className='flex items-center justify-center pr-8'>
                    <div className='flex items-center space-x-2 text-gray-500'>
                      <div className='h-0.5 w-8 bg-gradient-to-r from-purple-500/50 to-pink-500/50' />
                      <Plus className='h-4 w-4 text-purple-400' />
                      <div className='h-0.5 w-8 bg-gradient-to-r from-pink-500/50 to-purple-500/50' />
                    </div>
                  </div>
                )}

                <div className='relative z-10 flex flex-col items-center'>
                  {/* 플러스 도트 */}
                  <div className='z-20 mb-4 flex h-4 w-4 items-center justify-center rounded-full border-4 border-white bg-purple-500 shadow-lg'>
                    <Plus className='h-2 w-2 text-white' />
                  </div>

                  {/* Netflix 스타일 랭킹이 있는 "Next" 카드 */}
                  <div
                    className='group relative w-72 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-800/20 to-pink-800/20 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-purple-700/30 hover:to-pink-700/30'
                    onClick={onOpenStageClick}
                  >
                    {/* Next Version Netflix 스타일 랭킹 */}
                    <NetflixRankSVG version={sortedStages.length + 1} />

                    <div className='h-1 bg-gradient-to-r from-purple-500 to-pink-500' />

                    <div className='flex h-full flex-col items-center justify-center space-y-4 p-6 pt-12'>
                      {' '}
                      {/* Netflix 랭킹을 위한 상단 여백 */}
                      <div className='rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-4'>
                        <Plus className='h-8 w-8 text-white' />
                      </div>
                      <div className='space-y-2 text-center'>
                        <h3 className='text-xl font-bold text-white'>
                          OPEN STAGE
                        </h3>
                        <p className='text-sm text-gray-400'>
                          Start a new creative phase
                        </p>
                      </div>
                      <div className='text-center text-xs text-gray-500'>
                        Click to create new stage
                      </div>
                    </div>

                    {/* 호버 효과 */}
                    <div className='absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 빈 상태 */}
      {stages.length === 0 && (
        <div className='py-12 text-center'>
          <div className='mx-auto mb-4 h-16 w-16 rounded-full bg-gray-700/50 p-4'>
            <GitBranch className='h-8 w-8 text-gray-400' />
          </div>
          <h3 className='mb-2 text-lg font-medium text-gray-300'>
            No versions yet
          </h3>
          <p className='mb-6 text-gray-500'>
            Create your first stage to get started
          </p>
          <button
            onClick={onOpenStageClick}
            className='rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-purple-500/25'
          >
            Create First Stage
          </button>
        </div>
      )}
    </div>
  );
};

export default stagehisjim;
