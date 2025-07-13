import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

interface Props {
  url: string;
  isPlaying: boolean;
  onEnded?: () => void;
}

const WaveformPlayer = ({ url, isPlaying, onEnded }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#888",
      progressColor: "#fff",
      barWidth: 2,
      height: 60,
      url,
    });

    if (onEnded) {
      ws.on('finish', onEnded);
    }

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [url, onEnded]);

  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    if (isPlaying && !ws.isPlaying()) {
      ws.play();
    } else if (!isPlaying && ws.isPlaying()) {
      ws.pause();
    }
  }, [isPlaying]);


  return <div ref={containerRef} className="w-full h-full" />;
};

export default WaveformPlayer;