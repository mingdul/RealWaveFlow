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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#262626] rounded-xl p-6 max-w-5xl w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl border border-[#595959]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#D9D9D9] mb-2">
              Version {versionNumber}
            </h2>
            <p className="text-[#BFBFBF] text-sm">Stem Collection</p>
          </div>

          <div className="flex-1 text-center">
            <h3 className="text-lg font-semibold text-[#D9D9D9] mb-2">Description</h3>
            <div className="bg-[#595959] rounded-lg p-4 max-w-md mx-auto">
              <p className="text-[#D9D9D9] text-sm">This is a detailed description of the version and its contents.</p>
            </div>
          </div>

          <div className="flex-1 flex justify-end">
            <button
              onClick={onClose}
              className="text-[#BFBFBF] hover:text-[#D9D9D9] transition-colors p-2 rounded-lg hover:bg-[#595959]/50"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <Button variant="primary" size="lg">
            <Play size={16} className="mr-2" />
            Play All
          </Button>

          <Button variant="primary" size="lg">
            <Download size={16} className="mr-2" />
            Download All
          </Button>
        </div>
        {/* Stems Content */}
        {stems.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-[#595959]/30 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Music size={48} className="text-[#BFBFBF]" />
            </div>
            <h3 className="text-xl font-semibold text-[#D9D9D9] mb-2">No Stems Available</h3>
            <p className="text-[#BFBFBF]">이 버전에는 아직 스템이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stems.map((stem) => (
              <div key={stem.id} className="bg-[#595959]/30 rounded-lg p-6 border border-[#595959]/50 hover:border-[#BFBFBF]/30 transition-all duration-200">
                {/* Stem Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Music size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#D9D9D9]">{stem.name}</h3>
                      <p className="text-[#BFBFBF] text-sm">{stem.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlay(stem.id)}
                      className="p-3 hover:bg-[#595959]"
                    >
                      <Play size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(stem.id)}
                      className="p-3 hover:bg-[#595959]"
                    >
                      <Download size={18} />
                    </Button>
                  </div>
                </div>


              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#595959]/50">
          <div className="flex justify-between items-center">
            <p className="text-[#BFBFBF] text-sm">
              {stems.length} stem{stems.length !== 1 ? 's' : ''} in this version
            </p>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StemListModal; 