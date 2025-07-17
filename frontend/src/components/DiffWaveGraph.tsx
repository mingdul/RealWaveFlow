import React, { useRef, useEffect } from 'react';

interface DiffWaveGraphProps {
  waveformData?: number[];
  className?: string;
}

const DiffWaveGraph: React.FC<DiffWaveGraphProps> = ({
  waveformData,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update canvas size based on container
    const container = canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Generate waveform data if not provided
    const waveData = waveformData || Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.1);

    // Draw single waveform visualization
    const barWidth = width / waveData.length;
    const centerY = height / 2;

    waveData.forEach((value, index) => {
      const barHeight = value * height * 0.6;
      const y = centerY - barHeight / 2;
      
      // Create grayscale gradient effect (left to right)
      const gradient = ctx.createLinearGradient(index * barWidth, 0, (index + 1) * barWidth, 0);
      gradient.addColorStop(0, '#D9D9D9');
      gradient.addColorStop(0.5, '#BFBFBF');
      gradient.addColorStop(1, '#595959');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(index * barWidth, y, barWidth * 0.8, barHeight);
    });

    // Draw center line
    ctx.strokeStyle = '#595959';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

  }, [waveformData]);

  // Add resize observer to handle container size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Trigger redraw
        const event = new Event('resize');
        window.dispatchEvent(event);
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={`w-full h-12 sm:h-14 md:h-16 lg:h-20 bg-[#262626] rounded-lg flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default DiffWaveGraph;
