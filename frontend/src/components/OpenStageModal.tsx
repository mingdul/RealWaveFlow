import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Open Stage</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Description Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            DESCRIPTION
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="스테이지에 대한 리뷰를 작성하세요..."
            className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            rows={4}
          />
        </div>

        {/* Reviewer Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            REVIEWER
          </label>
          
          {/* Add Reviewer Input */}
          <div className="flex gap-2 mb-3">
            <Input
              value={newReviewerEmail}
              onChange={(e) => setNewReviewerEmail(e.target.value)}
              placeholder="리뷰어 이메일을 입력하세요"
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddReviewer}
              className="px-3"
            >
              <UserPlus size={16} />
            </Button>
          </div>

          {/* Reviewer List */}
          <div className="space-y-2">
            {reviewers.map(reviewer => (
              <div key={reviewer.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">{reviewer.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="text-white text-sm">{reviewer.username}</div>
                    <div className="text-gray-400 text-xs">{reviewer.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveReviewer(reviewer.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={!description.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            OPEN STAGE
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OpenStageModal; 