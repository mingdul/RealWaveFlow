import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';

export interface WaveformClonerProps {
  onReady?: (ws: WaveSurfer) => void;
}

const WaveformCloner = ({ onReady }: WaveformClonerProps) => {
  const waveRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!waveRef.current || !timelineRef.current || !minimapRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: waveRef.current,
      waveColor: '#666',
      progressColor: '#00ccff',
      height: 260,
      normalize: true,
      plugins: [
        TimelinePlugin.create({ container: timelineRef.current }),
        MinimapPlugin.create({
          container: minimapRef.current,
          waveColor: '#555',
          progressColor: '#36f7d3',
          height: 60,
        }),
      ],
    });

    wavesurfer.load('/audio/track_ex.wav');
    wavesurferRef.current = wavesurfer;

    wavesurfer.on('ready', () => {
      if (onReady) onReady(wavesurfer);
    });

    return () => wavesurfer.destroy();
  }, []);

  return (
    <div className="w-full bg-gray-900 rounded-md shadow-lg p-4 space-y-4">
      <div className="relative border border-gray-700 rounded overflow-hidden">
        <div id="wave-minimap" ref={minimapRef} className="h-[60px]" />
      </div>
      <div className="relative border border-gray-700 rounded overflow-hidden">
        <div id="wave-timeline" ref={timelineRef} className="h-[40px]" />
        <div id="wave-presentation" ref={waveRef} className="h-[260px]" />
      </div>
    </div>
  );
};

export default WaveformCloner;