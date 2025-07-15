// components/ConfirmModal.tsx
import React from 'react';

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
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-[#1f1f1f] p-6 rounded-lg shadow-lg border border-gray-700 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-lg font-semibold mb-4">{title}</h2>
        <p className="text-gray-400 text-sm mb-6">{description}</p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
