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
      <div className="recordmarker relative h-2 bg-gray-700">
        <div className="fill absolute top-0 left-0 h-full bg-red-500 w-1"></div>
      </div>

      {/* Cycle Marker */}
      <div 
        className="cyclemarker relative h-8 bg-gray-700 border-y border-gray-600"
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
          className="starthandle absolute top-0 h-full w-8 cursor-ew-resize flex items-center justify-center"
          style={{ left: `${cycleStart - 16}px` }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingCycle('start');
          }}
        >
          <div className="cycleknob w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.9644 25.6669H6.36899C6.0943 25.6669 5.83093 25.5578 5.63669 25.3636C5.44245 25.1694 5.33325 24.9059 5.33325 24.6312V7.36887C5.33325 7.09417 5.44245 6.83072 5.63669 6.63649C5.83093 6.44225 6.0943 6.33313 6.36899 6.33313H13.9644C14.2391 6.33313 14.5027 6.44225 14.6969 6.63649C14.8911 6.83072 15.0002 7.09417 15.0002 7.36887C15.0002 7.64357 14.8911 7.90702 14.6969 8.10125C14.5027 8.29549 14.2391 8.40461 13.9644 8.40461H7.40473V23.5955H13.9644C14.2391 23.5955 14.5027 23.7046 14.6969 23.8988C14.8911 24.0931 15.0002 24.3565 15.0002 24.6312C15.0002 24.9059 14.8911 25.1694 14.6969 25.3636C14.5027 25.5578 14.2391 25.6669 13.9644 25.6669Z" fill="currentColor"></path>
              <path d="M12.714 11.1233L16.8569 15.2663C16.9531 15.3624 17.0294 15.4766 17.0815 15.6022C17.1335 15.7279 17.1604 15.8626 17.1604 15.9986C17.1604 16.1346 17.1335 16.2693 17.0815 16.3949C17.0294 16.5206 16.9531 16.6347 16.8569 16.7309L12.714 20.8739C12.6179 20.9703 12.5037 21.0469 12.378 21.0992C12.2523 21.1515 12.1173 21.1785 11.9812 21.1786C11.845 21.1787 11.7102 21.152 11.5843 21.1C11.4585 21.0479 11.3441 20.9716 11.2479 20.8753C11.1516 20.779 11.0752 20.6646 11.0231 20.5388C10.9711 20.413 10.9444 20.2782 10.9446 20.142C10.9447 20.0058 10.9717 19.871 11.024 19.7452C11.0763 19.6195 11.1529 19.5054 11.2494 19.4093L13.6241 17.0343L14.6577 15.9986L13.6241 14.9629L11.2494 12.5879C11.0558 12.3936 10.9472 12.1304 10.9474 11.8561C10.9477 11.5817 11.0567 11.3187 11.2507 11.1248C11.4447 10.9308 11.7077 10.8217 11.982 10.8214C12.2563 10.8211 12.5196 10.9297 12.714 11.1233Z" fill="currentColor"></path>
            </svg>
          </div>
        </div>

        {/* Cycle Icon */}
        <div
          className="cycleicon absolute top-2 text-blue-400"
          style={{ left: `${(cycleStart + cycleEnd) / 2 - 8}px` }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
        </div>

        {/* End Handle */}
        <div
          className="endhandle absolute top-0 h-full w-8 cursor-ew-resize flex items-center justify-center"
          style={{ left: `${cycleEnd - 16}px` }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingCycle('end');
          }}
        >
          <div className="cycleknob w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.0356 6.33305L25.631 6.33306C25.9057 6.33306 26.1691 6.44217 26.3633 6.63641C26.5575 6.83065 26.6667 7.0941 26.6667 7.3688L26.6667 24.6311C26.6667 24.9058 26.5575 25.1693 26.3633 25.3635C26.1691 25.5578 25.9057 25.6669 25.631 25.6669L18.0356 25.6669C17.7609 25.6669 17.4974 25.5578 17.3031 25.3635C17.1089 25.1693 16.9998 24.9058 16.9998 24.6311C16.9998 24.3564 17.1089 24.093 17.3031 23.8987C17.4974 23.7045 17.7609 23.5954 18.0356 23.5954L24.5953 23.5954L24.5953 8.40454L18.0356 8.40453C17.7609 8.40453 17.4974 8.29542 17.3031 8.10118C17.1089 7.90694 16.9998 7.64349 16.9998 7.36879C16.9998 7.0941 17.1089 6.83065 17.3031 6.63641C17.4974 6.44217 17.7609 6.33305 18.0356 6.33305Z" fill="currentColor"></path>
              <path d="M19.286 20.8767L15.1431 16.7337C15.0469 16.6376 14.9706 16.5234 14.9185 16.3978C14.8665 16.2721 14.8396 16.1374 14.8396 16.0014C14.8396 15.8654 14.8665 15.7307 14.9185 15.6051C14.9706 15.4794 15.0469 15.3653 15.1431 15.2691L19.286 11.1261C19.3821 11.0297 19.4963 10.9531 19.622 10.9008C19.7477 10.8485 19.8827 10.8215 20.0188 10.8214C20.155 10.8213 20.2898 10.848 20.4157 10.9C20.5415 10.9521 20.6559 11.0284 20.7521 11.1247C20.8484 11.221 20.9248 11.3354 20.9769 11.4612C21.0289 11.587 21.0556 11.7219 21.0554 11.858C21.0553 11.9942 21.0283 12.129 20.976 12.2548C20.9237 12.3805 20.8471 12.4946 20.7506 12.5907L18.3759 14.9657L17.3423 16.0014L18.3759 17.0371L20.7506 19.4121C20.9442 19.6064 21.0528 19.8696 21.0526 20.1439C21.0523 20.4183 20.9433 20.6813 20.7493 20.8752C20.5553 21.0692 20.2923 21.1783 20.018 21.1786C19.7437 21.1789 19.4804 21.0703 19.286 20.8767Z" fill="currentColor"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Beat Ruler */}
      <div 
        className="beatruler relative h-6 bg-gray-800 border-b border-gray-700 cursor-pointer"
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
      <div className="gridcontrols absolute top-2 right-4 flex gap-2">
        <button
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            snapToGrid 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setSnapToGrid(!snapToGrid)}
          title="Snap to grid"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 9H4v2h5V9zM9 13H4v2h5v-2zM9 5H4v2h5V5zM13 9h-2v2h2V9zM13 13h-2v2h2v-2zM13 5h-2v2h2V5zM20 5h-5v2h5V5zM20 9h-5v2h5V9zM20 13h-5v2h5v-2z"/>
          </svg>
        </button>

        <button
          className="px-3 py-1 rounded text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Grid settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>

        <button
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            cycleMode 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setCycleMode(!cycleMode)}
          title="Cycle mode"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ReviewTimeline;
