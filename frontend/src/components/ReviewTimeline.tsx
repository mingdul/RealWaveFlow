import React, { useEffect, useState } from 'react';

interface ReviewTimelineProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

const ReviewTimeline: React.FC<ReviewTimelineProps> = ({
  duration,
  currentTime,
  onSeek
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [cycleStart] = useState(0);
  const [cycleEnd] = useState(400);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [cycleMode, setCycleMode] = useState(false);
  const [isDraggingCycle, setIsDraggingCycle] = useState<'start' | 'end' | 'move' | null>(null);

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isDragging) return;
    
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    onSeek(time);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingCycle(null);
  };

  useEffect(() => {
    if (isDragging || isDraggingCycle) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const target = document.querySelector('.beatruler') as HTMLDivElement;
        if (target) {
          const rect = target.getBoundingClientRect();
          const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
          const percentage = x / rect.width;
          const time = percentage * duration;
          onSeek(time);
        }
      };
      const handleGlobalMouseUp = () => handleMouseUp();
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, isDraggingCycle, duration, onSeek]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="timeline-controls-header-wrapper bg-gray-800 border-b border-gray-700">
      {/* Record Marker */}
      <div className="recordmarker relative h-1 sm:h-1.5 md:h-2 bg-gray-700">
        <div className="fill absolute top-0 left-0 h-full bg-red-500 w-1"></div>
      </div>

      {/* Cycle Marker */}
      <div 
        className="cyclemarker relative h-6 sm:h-7 md:h-8 bg-gray-700 border-y border-gray-600"
        style={{ 
          background: `linear-gradient(90deg, 
            transparent ${cycleStart}px, 
            rgba(59, 130, 246, 0.2) ${cycleStart}px, 
            rgba(59, 130, 246, 0.2) ${cycleEnd}px, 
            transparent ${cycleEnd}px)`
        }}
      >
        <div className="sr-only">
          <span>This cycle marker allows you to set a loop region, enable and disable cycle mode. Use the handles to adjust the start and end points, or drag the middle to move the entire region.</span>
        </div>
        
        {/* Cycle beats visualization */}
        <div className="cyclebeats absolute top-0 left-0 w-full h-full">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full w-px bg-gray-500 opacity-30"
              style={{ left: `${(i / 16) * 100}%` }}
            />
          ))}
        </div>

        {/* Move Handle */}
        <div
          className="movehandle absolute top-0 h-full cursor-move"
          style={{ left: `${cycleStart}px`, width: `${cycleEnd - cycleStart}px` }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingCycle('move');
          }}
        />

        {/* Start Handle */}
        <div
          className="starthandle absolute top-0 h-full w-2 bg-blue-500 cursor-ew-resize"
          style={{ left: `${cycleStart}px` }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingCycle('start');
          }}
        />

        {/* End Handle */}
        <div
          className="endhandle absolute top-0 h-full w-2 bg-blue-500 cursor-ew-resize"
          style={{ left: `${cycleEnd}px` }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingCycle('end');
          }}
        />
      </div>

      {/* Beat Ruler */}
      <div 
        className="beatruler relative h-5 sm:h-6 bg-gray-800 border-b border-gray-700 cursor-pointer"
        onMouseDown={(e) => {
          setIsDragging(true);
          handleMouseMove(e);
        }}
      >
        <div className="absolute top-0 left-0 w-full h-full">
          {/* Major beats */}
          {Array.from({ length: 17 }, (_, i) => (
            <div key={i} className="absolute top-0 h-full flex flex-col">
              <div
                className="absolute top-0 w-px h-full bg-gray-400"
                style={{ left: `${(i / 16) * 100}%` }}
              />
              <span
                className="absolute top-1 text-xs text-gray-400"
                style={{ left: `${(i / 16) * 100}%`, transform: 'translateX(-50%)' }}
              >
                {i + 1}
              </span>
            </div>
          ))}
          
          {/* Minor beats */}
          {Array.from({ length: 64 }, (_, i) => {
            if (i % 4 === 0) return null; // Skip major beats
            return (
              <div
                key={`minor-${i}`}
                className="absolute top-0 w-px h-2 bg-gray-500"
                style={{ left: `${(i / 64) * 100}%` }}
              />
            );
          })}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-lg z-10"
          style={{ left: `${progressPercentage}%` }}
        >
          <div className="absolute -top-1 -left-1 w-0 h-0 border-l-2 border-r-2 border-b-2 border-l-transparent border-r-transparent border-b-white" />
        </div>
      </div>

      {/* Drag guides */}
      <div className="dragguide hidden absolute top-0 w-px bg-yellow-400 z-20" />
      <div className="cyclestartguide hidden absolute top-0 w-px bg-blue-400 z-20" />
      <div className="cycleendguide hidden absolute top-0 w-px bg-blue-400 z-20" />

      {/* Grid Controls */}
      <div className="gridcontrols absolute top-1 sm:top-2 right-2 sm:right-4 flex gap-1 sm:gap-2">
        <button
          className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
            snapToGrid 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setSnapToGrid(!snapToGrid)}
          title="Snap to grid"
        >
          <svg width="12" height="12" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 9H4v2h5V9zM9 13H4v2h5v-2zM9 5H4v2h5V5zM13 9h-2v2h2V9zM13 13h-2v2h2v-2zM13 5h-2v2h2V5zM20 5h-5v2h5V5zM20 9h-5v2h5V9zM20 13h-5v2h5v-2z"/>
          </svg>
        </button>

        <button
          className="px-2 py-0.5 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Grid settings"
        >
          <svg width="12" height="12" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>

        <button
          className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
            cycleMode 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setCycleMode(!cycleMode)}
          title="Cycle mode"
        >
          <svg width="12" height="12" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ReviewTimeline;
