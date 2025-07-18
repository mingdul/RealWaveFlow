// components/ConfirmModal.tsx
import React from 'react';
import AnimatedModal from './AnimatedModal';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onCancel}
      animationType="scale"
      className="bg-[#1f1f1f] p-6 rounded-lg shadow-lg border border-gray-700 max-w-sm w-full mx-4"
    >
      <h2 className="text-white text-lg font-semibold mb-4">{title}</h2>
      <p className="text-gray-400 text-sm mb-6">{description}</p>
      <div className="flex justify-end gap-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors duration-200"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-colors duration-200"
        >
          {confirmText}
        </button>
      </div>
    </AnimatedModal>
  );
};

export default ConfirmModal;
