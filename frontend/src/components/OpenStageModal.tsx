import React, { useState, useEffect } from 'react';
import { X, Users, FileText, CirclePlus, Check, UserCheck } from 'lucide-react';
import { Button, Input } from './';
import trackService from '../services/trackService';
// import { createStageReviewer } from '../services/stageReviewerService';
import { TrackCollaborator } from '../types/api';
// import { Track } from '../types/api';

interface User {
  id: string;
  username: string;
  email: string;
}

interface OpenStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string, reviewerIds: string[]) => void;
  trackId: string;
}

const OpenStageModal: React.FC<OpenStageModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  trackId
}) => {
  const [description, setDescription] = useState('');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 트랙 참여인원 가져오기
  useEffect(() => {
    if (isOpen && trackId) {
      fetchTrackParticipants();
    }
  }, [isOpen, trackId]);

  const fetchTrackParticipants = async () => {
    setLoading(true);
    try {
      // 트랙 정보와 협업자 정보를 가져오기
      const [trackResponse, collaboratorsResponse] = await Promise.all([
        trackService.getTrackById(trackId),
        trackService.getCollaborators(trackId)
      ]);

      const users: User[] = [];
      let ownerId: string | null = null;
      
      // 트랙 오너 ID 저장 (리뷰어 리스트에서 제외하기 위해)
      if (trackResponse.success && trackResponse.data?.owner_id) {
        ownerId = trackResponse.data.owner_id.id;
      }

      // 협업자들만 추가 (오너는 자동으로 리뷰어가 되므로 제외)
      if (collaboratorsResponse.success && collaboratorsResponse.data) {
        collaboratorsResponse.data.forEach((collaborator: TrackCollaborator) => {
          if (collaborator.user_id && collaborator.user_id.id !== ownerId) {
            users.push({
              id: collaborator.user_id.id,
              username: collaborator.user_id.username || 'User',
              email: collaborator.user_id.email || 'user@example.com'
            });
          }
        });
      }

      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to fetch track participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReviewer = (userId: string) => {
    setSelectedReviewers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = () => {
    if (description.trim()) {
      onSubmit(description, selectedReviewers);
      setDescription('');
      setSelectedReviewers([]);
      onClose();
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#262626] rounded-xl p-4 sm:p-6 max-w-sm sm:max-w-md lg:max-w-lg w-full mx-4 shadow-2xl border border-[#595959] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <CirclePlus size={16} className="sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#D9D9D9]">Open Stage</h2>
              <p className="text-[#BFBFBF] text-sm">Create a new review session</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#BFBFBF] hover:text-[#D9D9D9] transition-colors p-2 rounded-lg hover:bg-[#595959]/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Description Section */}
        <div className="space-y-4 sm:space-y-6 mb-6">
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
              Select Reviewers
            </label>
            <span className="text-xs text-[#BFBFBF] ml-2">({selectedReviewers.length} selected)</span>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search participants..."
              className="bg-[#595959]/30 border-[#595959]/50 focus:border-[#BFBFBF] focus:ring-[#BFBFBF]/50"
            />
          </div>

          {/* Participants List */}
          {loading ? (
            <div className="text-center py-6 bg-[#595959]/10 rounded-lg border border-[#595959]/30">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
              <p className="text-[#BFBFBF] text-sm">Loading participants...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto bg-[#595959]/10 p-3 rounded-lg border border-[#595959]/30">
              {filteredUsers.map(user => (
                <div 
                  key={user.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    selectedReviewers.includes(user.id)
                      ? 'bg-purple-500/20 border-purple-500/50 hover:border-purple-400/70'
                      : 'bg-[#595959]/20 border-[#595959]/30 hover:border-[#BFBFBF]/30'
                  }`}
                  onClick={() => toggleReviewer(user.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                      selectedReviewers.includes(user.id)
                        ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                        : 'bg-gradient-to-br from-gray-500 to-gray-600'
                    }`}>
                      <span className="text-white font-semibold text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-[#D9D9D9] font-medium text-sm">{user.username}</div>
                      <div className="text-[#BFBFBF] text-xs">{user.email}</div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    selectedReviewers.includes(user.id)
                      ? 'bg-purple-500 border-purple-500'
                      : 'border-[#BFBFBF] hover:border-purple-400'
                  }`}>
                    {selectedReviewers.includes(user.id) && (
                      <Check size={12} className="text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-[#595959]/10 rounded-lg border border-[#595959]/30">
              <UserCheck size={32} className="text-[#BFBFBF] mx-auto mb-2" />
              <p className="text-[#BFBFBF] text-sm">
                {searchTerm ? 'No participants found' : 'No participants available'}
              </p>
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