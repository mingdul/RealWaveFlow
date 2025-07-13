import {useRef, useState } from 'react';
import WaveformCloner from '../components/wave';

const AudioEditorPage = () => {
  const wavesurferRef = useRef<any>(null);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showCommentList, setShowCommentList] = useState(false);

  const handleReady = (ws: any) => {
    wavesurferRef.current = ws;
    setDuration(ws.getDuration());

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });
  };

  const togglePlay = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
  };

  const stopPlayback = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.stop();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(vol);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#1e1e1e] text-white px-6 py-8 space-y-6 overflow-hidden">
      {/* Top-right floating buttons */}
      <div className="absolute top-8 right-6 flex flex-col gap-2 z-50">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="bg-[#3a3a3a] hover:bg-[#555] text-sm px-3 py-1 rounded"
        >
          Show History
        </button>
        <button
          onClick={() => setShowCommentList(!showCommentList)}
          className="bg-[#3a3a3a] hover:bg-[#555] text-sm px-3 py-1 rounded"
        >
          Comments
        </button>
      </div>

      {/* Sidebars */}
      {showHistory && (
        <div className="fixed top-0 right-0 w-64 h-full bg-[#2a2a2a] shadow-lg z-40 px-4 py-6">
          <h2 className="text-lg font-bold mb-4">History</h2>
          <ul className="space-y-2 text-sm">
            <li>- 수정 1: Kick compression 조정</li>
            <li>- 수정 2: Bass tone 리밸런싱</li>
            <li>- 수정 3: Vocal layer 추가</li>
          </ul>
        </div>
      )}
      {showCommentList && (
        <div className="fixed top-0 right-0 w-64 h-full bg-[#2a2a2a] shadow-lg z-40 px-4 py-6">
          <h2 className="text-lg font-bold mb-4">Comments</h2>
          <ul className="space-y-2 text-sm">
            <li>🗨️ 01:06 - "킥이 너무 세요"</li>
            <li>🗨️ 01:12 - "이 부분 페이드 넣어주세요"</li>
          </ul>
        </div>
      )}

      {/* Waveform */}
      <WaveformCloner onReady={handleReady} />

      {/* Control Bar */}
      <div className="flex items-center bg-[#2b2b2b] px-6 py-3 rounded shadow text-sm">
        <button onClick={stopPlayback} className="ml-6 text-white hover:text-gray-300">
          <svg viewBox="0 0 16 16" height="16"><use xlinkHref="#stop" /></svg>
        </button>
        <button onClick={togglePlay} className="ml-3 text-white hover:text-gray-300">
          <svg viewBox="0 0 16 16" height="16"><use xlinkHref="#play" /></svg>
        </button>
        <button className="ml-2 text-white hover:text-gray-300">
          <svg viewBox="0 0 16 16" height="16"><use xlinkHref="#repeatall" /></svg>
        </button>
        <div className="ml-4 flex items-center">
          <span className="mr-2 text-white material-icons">volume_up</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 accent-blue-500"
          />
        </div>
        <div className="ml-5 text-white">
          <span>
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
          </span>
        </div>
        <div className="mr-5 ml-auto">
          <button className="px-3 py-1 rounded bg-[#3a3a3a] hover:bg-[#4a4a4a] text-sm">1x</button>
        </div>
        <button className="mr-3 text-white hover:text-gray-300 material-icons">zoom_in</button>
        <button className="mr-5 text-white hover:text-gray-300 material-icons">zoom_out</button>
      </div>

      {/* Comment Input */}
      <div className="bg-[#2c2c2c] rounded-md px-4 py-3 flex items-center gap-3 shadow">
        <span className="bg-gray-700 text-sm px-2 py-1 rounded">
          {String(Math.floor(currentTime / 60)).padStart(2, '0')}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
        </span>
        <input type="checkbox" checked className="accent-green-500" readOnly />
        <span className="text-xs text-white bg-gray-600 px-2 py-1 rounded">장</span>
        <input
          type="text"
          placeholder="Leave your comment..."
          className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
        />
        <button className="text-gray-400 hover:text-white">▶️</button>
      </div>
    </div>
  );
};

export default AudioEditorPage;