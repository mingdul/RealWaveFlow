import React, { useState } from 'react';
import ReviewTimeline from '../components/ReviewTimeline';

// Mock 데이터 - 실제 DAW 트랙 구조
const mockTracks = [
  {
    id: 1,
    name: 'Session Branch1',
    type: 'master',
    volume: 0.75,
    muted: false,
    solo: false,
    clips: [
      { id: 'c1', start: 0, duration: 30, color: '#ef4444', name: 'Intro' },
      { id: 'c2', start: 35, duration: 25, color: '#22c55e', name: 'Verse' },
      { id: 'c3', start: 65, duration: 20, color: '#a855f7', name: 'Chorus' }
    ],
    waveform: [0.2, 0.4, 0.6, 0.8, 0.7, 0.9, 0.5, 0.3, 0.6, 0.8, 0.4, 0.2, 0.7, 0.9, 0.6, 0.3, 0.8, 0.5, 0.2, 0.4]
  },
  {
    id: 2,
    name: 'Copy of Session Branch1',
    type: 'update',
    volume: 0.6,
    muted: false,
    solo: false,
    clips: [
      { id: 'c4', start: 0, duration: 32, color: '#ec4899', name: 'Intro' },
      { id: 'c5', start: 37, duration: 23, color: '#06b6d4', name: 'Verse' },
      { id: 'c6', start: 63, duration: 22, color: '#8b5cf6', name: 'Chorus' }
    ],
    waveform: [0.3, 0.5, 0.7, 0.9, 0.6, 0.8, 0.4, 0.2, 0.5, 0.7, 0.3, 0.1, 0.6, 0.8, 0.5, 0.2, 0.7, 0.4, 0.1, 0.3]
  },
  {
    id: 3,
    name: 'Uploaded Elements',
    type: 'master',
    volume: 0.8,
    muted: false,
    solo: false,
    clips: [
      { id: 'c7', start: 10, duration: 15, color: '#3b82f6', name: 'Element1' },
      { id: 'c8', start: 30, duration: 12, color: '#f59e0b', name: 'Element2' }
    ],
    waveform: [0.1, 0.3, 0.5, 0.7, 0.4, 0.6, 0.2, 0.8, 0.4, 0.6, 0.2, 0.4, 0.5, 0.7, 0.3, 0.1, 0.6, 0.3, 0.5, 0.2]
  },
  {
    id: 4,
    name: 'Copy of Uploaded...',
    type: 'update',
    volume: 0.9,
    muted: false,
    solo: false,
    clips: [
      { id: 'c9', start: 12, duration: 18, color: '#10b981', name: 'Element1' },
      { id: 'c10', start: 35, duration: 10, color: '#f97316', name: 'Element2' }
    ],
    waveform: [0.4, 0.6, 0.8, 0.5, 0.7, 0.3, 0.9, 0.2, 0.6, 0.8, 0.4, 0.2, 0.7, 0.5, 0.3, 0.8, 0.4, 0.6, 0.2, 0.5]
  }
];

const sections = ['Intro', 'Verse', 'Chorus', 'Outro'];

const ReviewPage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(47.7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration] = useState(120);
  const [tracks, setTracks] = useState(mockTracks);
  const [masterVolume, setMasterVolume] = useState(0.75);
  const [tempo, setTempo] = useState(120);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = (time % 60).toFixed(1);
    return `${minutes.toString().padStart(2, '0')}:${seconds.padStart(4, '0')}`;
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleVolumeChange = (trackId: number, volume: number) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, volume } : track
    ));
  };

  const handleMute = (trackId: number) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, muted: !track.muted } : track
    ));
  };

  const handleSolo = (trackId: number) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, solo: !track.solo } : track
    ));
  };

  const generateWaveformPath = (waveform: number[], width: number, height: number) => {
    const points = waveform.map((value, index) => {
      const x = (index / (waveform.length - 1)) * width;
      const y = height - (value * height);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* 상단 타임라인 헤더 - ReviewTimeline 컴포넌트 사용 */}
      <ReviewTimeline
        duration={duration}
        currentTime={currentTime}
        onSeek={handleSeek}
      />

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex">
        {/* 왼쪽 트랙 헤더 패널 */}
        <div className="w-64 bg-gray-900 border-r border-gray-700">
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`h-20 flex items-center px-3 border-b border-gray-700 ${
                track.type === 'master' ? 'bg-gray-800' : 'bg-gray-850'
              }`}
            >
              <div className="flex-1 space-y-2">
                {/* 트랙 이름 */}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    track.type === 'master' ? 'bg-green-500' : 'bg-blue-500'
                  }`}></div>
                  <span className="text-sm font-medium truncate">{track.name}</span>
                </div>
                
                {/* 컨트롤 버튼들 */}
                <div className="flex items-center space-x-2">
                  {/* 볼륨 노브 */}
                  <div className="relative">
                    <div className="w-8 h-8 bg-gray-700 rounded-full border-2 border-gray-600 flex items-center justify-center">
                      <div 
                        className="w-1 h-3 bg-white rounded-full"
                        style={{
                          transform: `rotate(${(track.volume - 0.5) * 270}deg)`
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={track.volume}
                      onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  
                  {/* 음소거 버튼 */}
                  <button
                    onClick={() => handleMute(track.id)}
                    className={`w-8 h-6 rounded text-xs font-bold ${
                      track.muted 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    M
                  </button>
                  
                  {/* 솔로 버튼 */}
                  <button
                    onClick={() => handleSolo(track.id)}
                    className={`w-8 h-6 rounded text-xs font-bold ${
                      track.solo 
                        ? 'bg-yellow-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    S
                  </button>
                  
                  {/* 볼륨 레벨 표시 */}
                  <div className="text-xs text-gray-400 w-8 text-center">
                    {Math.round(track.volume * 100)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 메인 트랙 영역 */}
        <div className="flex-1 bg-gray-950 relative">
          {/* 수직 시간 그리드 */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 25 }, (_, i) => i * 5).map((seconds) => (
              <div
                key={seconds}
                className="absolute top-0 bottom-0 w-px bg-gray-700 opacity-30"
                style={{ left: `${(seconds / duration) * 100}%` }}
              />
            ))}
          </div>

          {tracks.map((track) => (
            <div
              key={track.id}
              className="h-20 border-b border-gray-700 relative"
            >
              {/* 배경 파형 */}
              <div className="absolute inset-0 p-2">
                <svg 
                  width="100%" 
                  height="100%" 
                  viewBox="0 0 1000 60"
                  className="opacity-20"
                >
                  <path
                    d={generateWaveformPath(track.waveform, 1000, 60)}
                    stroke={track.type === 'master' ? '#22c55e' : '#3b82f6'}
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              </div>

              {/* 오디오 클립들 */}
              {track.clips.map((clip) => (
                <div
                  key={clip.id}
                  className="absolute top-3 bottom-3 rounded-lg flex items-center px-3 text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity shadow-lg border border-white/20"
                  style={{
                    left: `${(clip.start / duration) * 100}%`,
                    width: `${(clip.duration / duration) * 100}%`,
                    backgroundColor: clip.color,
                    backgroundImage: `linear-gradient(45deg, 
                      rgba(255,255,255,0.1) 25%, 
                      transparent 25%, 
                      transparent 50%, 
                      rgba(255,255,255,0.1) 50%, 
                      rgba(255,255,255,0.1) 75%, 
                      transparent 75%, 
                      transparent
                    )`,
                    backgroundSize: '8px 8px'
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full opacity-70" />
                    <span className="truncate">{clip.name}</span>
                  </div>
                </div>
              ))}

              {/* 재생 위치 라인 */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-20 pointer-events-none"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          ))}
        </div>

        {/* 오른쪽 섹션 패널 */}
        <div className="w-32 bg-gray-900 border-l border-gray-700">
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3">Sections</h3>
            {sections.map((section) => (
              <div
                key={section}
                className="mb-2 p-2 bg-gray-800 rounded text-xs text-center cursor-pointer hover:bg-gray-700 transition-colors"
              >
                {section}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 마스터 컨트롤바 */}
      <div className="h-20 bg-gray-900 border-t border-gray-700 flex items-center px-6">
        <div className="flex items-center space-x-6">
          {/* 재생 컨트롤 */}
          <div className="flex items-center space-x-2">
            <button className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors">
              <span className="text-white text-sm">⏮</span>
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
            >
              <span className="text-white text-lg">
                {isPlaying ? '⏸' : '▶'}
              </span>
            </button>
            <button className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors">
              <span className="text-white text-sm">⏭</span>
            </button>
          </div>
          
          {/* 시간 표시 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Time:</span>
            <span className="text-sm font-mono">{formatTime(currentTime)}</span>
            <span className="text-gray-600">/</span>
            <span className="text-sm font-mono text-gray-400">{formatTime(duration)}</span>
          </div>

          {/* 템포 컨트롤 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">BPM:</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setTempo(Math.max(60, tempo - 1))}
                className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                -
              </button>
              <span className="text-sm font-mono w-12 text-center">{tempo}</span>
              <button
                onClick={() => setTempo(Math.min(200, tempo + 1))}
                className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* 마스터 볼륨 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Master:</span>
            <div className="relative">
              <div className="w-10 h-10 bg-gray-700 rounded-full border-2 border-gray-600 flex items-center justify-center">
                <div 
                  className="w-1 h-4 bg-white rounded-full"
                  style={{
                    transform: `rotate(${(masterVolume - 0.5) * 270}deg)`
                  }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-center">
              {Math.round(masterVolume * 100)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;