import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button, StemPlayer } from './';
import { StemStreamingInfo } from '../services/streamingService';
import ConfirmModal from './ConfirmModal';
import AnimatedModal from './AnimatedModal';

interface StemListModalProps {
  isOpen: boolean;
  onClose: () => void;
  stems: StemStreamingInfo[];
  versionNumber: string;
  loading?: boolean;
  onRollBack?: () => void;
  onShowStage?: (stageId: string) => void;
  stageId?: string; // 가이드 재생을 위한 스테이지 ID
}

const StemListModal: React.FC<StemListModalProps> = ({
  isOpen,
  onClose,
  stems,
  versionNumber,
  loading = false,
  onRollBack,
  onShowStage,
  stageId
}) => {
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);

  console.log('StemListModal stems:', stems);
  console.log('StemListModal versionNumber:', versionNumber);

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      animationType="scale"
      className="bg-[#262626] rounded-xl p-4 sm:p-6 max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-6xl w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl border border-[#595959]"
    >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[#D9D9D9] mb-2">
              Version {versionNumber}
            </h2>
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className="text-white p-2"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4 md:space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              {/* 뭐묘 */}
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : stems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#BFBFBF] text-lg">스템 파일이 없습니다.</p>
              <p className="text-[#8C8C8C] text-sm mt-2">
                이 버전에는 아직 스템이 업로드되지 않았습니다.
              </p>
            </div>
          ) : (
            <StemPlayer stems={stems} stageId={stageId} onShowStage={onShowStage}/>
          )}
        </div>

        {/* Roll Back Button */}
        {onRollBack && (
          <div className="mt-6 pt-6 border-t border-[#595959] flex">
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setShowRollbackConfirm(true)}
            >
              Roll Back
            </Button>
          </div>
        )}

        {/* Rollback Confirm Modal */}
        <ConfirmModal
          isOpen={showRollbackConfirm}
          title="Are you sure you want to roll back?"
          description="All stages created after the selected version will be permanently deleted. This action cannot be undone."
          confirmText="Confirm Rollback"
          cancelText="Cancel"
          onConfirm={() => {
            setShowRollbackConfirm(false);
            onClose(); // Close the stem list modal first
            if (onRollBack) onRollBack();
          }}
          onCancel={() => setShowRollbackConfirm(false)}
        />
    </AnimatedModal>
  );
};

export default StemListModal; 