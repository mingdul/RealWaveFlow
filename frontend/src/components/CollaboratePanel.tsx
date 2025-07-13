import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';

interface CollaboratePanelProps {
  isOpen: boolean;
  onClose: () => void;
  trackId?: string;
}

const CollaboratePanel: React.FC<CollaboratePanelProps> = ({ 
  isOpen, 
  onClose, 
  trackId 
}) => {
  const [shareUrl] = useState(`${window.location.origin}/track/${trackId}`);
  const { showSuccess } = useToast();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccess('Link copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess('Link copied to clipboard!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-12 w-80 bg-white shadow-xl border rounded-lg p-4 z-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-black">Track Collaboration Share</h2>
        <button 
          onClick={onClose} 
          className="text-black hover:text-gray-700 text-xl font-bold"
        >
          ✕
        </button>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Share Link</p>
        <div className="w-full border rounded px-3 py-2 bg-gray-50 text-black text-sm break-all">
          {shareUrl}
        </div>
      </div>

      <button 
        onClick={handleCopyLink}
        className="w-full bg-[#FA576A] text-white py-2 rounded font-semibold hover:bg-[#D60017] transition-colors"
      >
        🔗 Copy Link
      </button>
    </div>
  );
};

export default CollaboratePanel; 