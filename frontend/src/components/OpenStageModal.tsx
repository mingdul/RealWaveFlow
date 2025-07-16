import React, { useState } from 'react';
import { X, UserPlus, Users, FileText, CirclePlus } from 'lucide-react';
import { Button, Input } from './';

interface Reviewer {
  id: string;
  username: string;
  email: string;
}

interface OpenStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string, reviewers: Reviewer[]) => void;
}

const OpenStageModal: React.FC<OpenStageModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}) => {
  const [description, setDescription] = useState('');
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [newReviewerEmail, setNewReviewerEmail] = useState('');

  const handleAddReviewer = () => {
    if (newReviewerEmail.trim()) {
      const newReviewer: Reviewer = {
        id: Date.now().toString(),
        username: newReviewerEmail.split('@')[0],
        email: newReviewerEmail
      };
      setReviewers([...reviewers, newReviewer]);
      setNewReviewerEmail('');
    }
  };

  const handleRemoveReviewer = (id: string) => {
    setReviewers(reviewers.filter(r => r.id !== id));
  };

  const handleSubmit = () => {
    if (description.trim()) {
      onSubmit(description, reviewers);
      setDescription('');
      setReviewers([]);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddReviewer();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#262626] rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-[#595959]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <CirclePlus size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#D9D9D9]">Open Stage</h2>
              <p className="text-[#BFBFBF] text-sm">Create a new review session</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#BFBFBF] hover:text-[#D9D9D9] transition-colors p-2 rounded-lg hover:bg-[#595959]/50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Description Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-[#BFBFBF]" />
            <label className="text-sm font-semibold text-[#D9D9D9] uppercase tracking-wide">
              Description
            </label>
          </div>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description..."
              className="w-full h-32 p-4 bg-[#595959]/30 border border-[#595959]/50 rounded-lg text-[#D9D9D9] placeholder-[#BFBFBF] focus:outline-none focus:border-[#BFBFBF] focus:ring-1 focus:ring-[#BFBFBF]/50 transition-all duration-200 resize-none"
              rows={4}
            />
            <div className="absolute bottom-3 right-3 text-xs text-[#BFBFBF]">
              {description.length}/500
            </div>
          </div>
        </div>

        {/* Reviewer Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-[#BFBFBF]" />
            <label className="text-sm font-semibold text-[#D9D9D9] uppercase tracking-wide">
              Reviewers
            </label>
            <span className="text-xs text-[#BFBFBF] ml-2">({reviewers.length})</span>
          </div>
          
          {/* Add Reviewer Input */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <Input
                value={newReviewerEmail}
                onChange={(e) => setNewReviewerEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter reviewer email"
                className="bg-[#595959]/30 border-[#595959]/50 focus:border-[#BFBFBF] focus:ring-[#BFBFBF]/50"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddReviewer}
              disabled={!newReviewerEmail.trim()}
              className="px-4 border-[#595959] text-[#D9D9D9] hover:bg-[#595959] disabled:opacity-50"
            >
              <UserPlus size={16} />
            </Button>
          </div>

          {/* Reviewer List */}
          {reviewers.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {reviewers.map(reviewer => (
                <div key={reviewer.id} className="flex items-center justify-between bg-[#595959]/20 p-3 rounded-lg border border-[#595959]/30 hover:border-[#BFBFBF]/30 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white font-semibold text-sm">{reviewer.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="text-[#D9D9D9] font-medium text-sm">{reviewer.username}</div>
                      <div className="text-[#BFBFBF] text-xs">{reviewer.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveReviewer(reviewer.id)}
                    className="text-[#BFBFBF] hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-[#595959]/10 rounded-lg border border-[#595959]/30">
              <Users size={32} className="text-[#BFBFBF] mx-auto mb-2" />
              <p className="text-[#BFBFBF] text-sm">no reviewers</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-[#595959]/50">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-[#595959] text-[#D9D9D9] hover:bg-[#595959]"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={!description.trim()}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CirclePlus size={16} className="mr-2" />
            OPEN STAGE
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OpenStageModal; 