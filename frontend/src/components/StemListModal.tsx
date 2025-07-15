import React from 'react';
import { X } from 'lucide-react';
import { Button, StemPlayer } from './';
import { StemStreamingInfo } from '../services/streamingService';

interface StemListModalProps {
  isOpen: boolean;
  onClose: () => void;
  stems: StemStreamingInfo[];
  versionNumber: string;
  loading?: boolean;
}

const StemListModal: React.FC<StemListModalProps> = ({
  isOpen,
  onClose,
  stems,
  versionNumber,
  loading = false
}) => {
  console.log('StemListModal stems:', stems);
  console.log('StemListModal versionNumber:', versionNumber);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#262626] rounded-xl p-6 max-w-6xl w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl border border-[#595959]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#D9D9D9] mb-2">
              Version {versionNumber}
            </h2>
            <h3 className="text-[#BFBFBF] text-sm">
              upstreams message
            </h3>
            <p>
              
            </p>
            
            <p className="text-[#BFBFBF] text-sm">
              Stem Collection
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[#BFBFBF] hover:text-white hover:bg-[#595959] p-2"
          >
            <X size={24} />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : stems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#BFBFBF] text-lg">스템 파일이 없습니다.</p>
              <p className="text-[#8C8C8C] text-sm mt-2">
                이 버전에는 아직 스템이 업로드되지 않았습니다.
              </p>
            </div>
          ) : (
            <StemPlayer stems={stems} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-6 border-t border-[#595959] mt-8">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-[#BFBFBF] border-[#595959] hover:bg-[#595959] hover:text-white"
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StemListModal; 