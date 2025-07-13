import React from 'react';
import { X, Play, Download, Music } from 'lucide-react';
import { Button } from './';

interface StemInfo {
  id: string;
  name: string;
  category: string;
  duration: string;
  size: string;
  uploader: string;
  uploadDate: string;
  waveformUrl?: string;
}

interface StemListModalProps {
  isOpen: boolean;
  onClose: () => void;
  stems: StemInfo[];
  versionNumber: string;
}

const StemListModal: React.FC<StemListModalProps> = ({ 
  isOpen, 
  onClose, 
  stems, 
  versionNumber 
}) => {
  if (!isOpen) return null;

  const handlePlay = (stemId: string) => {
    // TODO: 스템 재생 로직 구현
    console.log('Playing stem:', stemId);
  };

  const handleDownload = (stemId: string) => {
    // TODO: 스템 다운로드 로직 구현
    console.log('Downloading stem:', stemId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            모든 스템 보기 - Version {versionNumber}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {stems.length === 0 ? (
          <div className="text-center py-8">
            <Music size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">이 버전에는 아직 스템이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stems.map((stem) => (
              <div key={stem.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                      <Music size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{stem.name}</h3>
                      <p className="text-gray-400 text-sm">{stem.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlay(stem.id)}
                      className="p-2"
                    >
                      <Play size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(stem.id)}
                      className="p-2"
                    >
                      <Download size={16} />
                    </Button>
                  </div>
                </div>

                {/* Waveform Placeholder */}
                <div className="bg-gray-600 h-16 rounded mb-3 flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 30 }, (_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-purple-500 rounded-full"
                        style={{ height: `${Math.random() * 40 + 10}px` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-400">
                  <span>Duration: {stem.duration}</span>
                  <span>Size: {stem.size}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>By: {stem.uploader}</span>
                  <span>{stem.uploadDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StemListModal; 