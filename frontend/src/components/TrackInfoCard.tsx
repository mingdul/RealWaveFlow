import React, { useState } from 'react';
import { Play, Plus, Pause, X } from 'lucide-react';
import { Button, StemPlayer } from './';
import { Track } from '../types/api';
import { StemStreamingInfo } from '../services/streamingService';
import PresignedImage from './PresignedImage';
import ConfirmModal from './ConfirmModal';
import inviteService from '../services/inviteService';

interface TrackInfoCardProps {
  track: Track;
  stems?: StemStreamingInfo[];
  onPlay?: () => void;
  onShowAllStems?: () => void;
  onRollBack?: () => void;
  stemsLoading?: boolean;
  versionNumber?: string;
}

const TrackInfoCard: React.FC<TrackInfoCardProps> = ({
  track,
  stems = [],
  onPlay,
  onShowAllStems,
  versionNumber,
  onRollBack,
  stemsLoading = false
}) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const handlePlayClick = () => {
    if (stems.length > 0) {
      setShowPlayer(!showPlayer);
    } else if (onPlay) {
      onPlay();
    }
  };

  const onAddCollaborator = () => {
    setShowInviteModal(true);
    setInviteEmails('');
    setInviteError('');
    setInviteSuccess('');
  };

  const handleSendInvites = async () => {
    if (!inviteEmails.trim()) {
      setInviteError('이메일을 입력해주세요.');
      return;
    }

    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      // 쉼표나 줄바꿈으로 구분된 이메일을 배열로 변환
      const emailList = inviteEmails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);

      if (emailList.length === 0) {
        setInviteError('유효한 이메일을 입력해주세요.');
        return;
      }

      const result = await inviteService.sendTrackInvites(track.id, emailList);
      
      if (result.success) {
        setInviteSuccess(`${result.sent_count}개의 초대가 성공적으로 발송되었습니다.`);
      } else {
        setInviteError(result.message || '초대 발송에 실패했습니다.');
      }
      setInviteEmails('');
      
      // 3초 후 모달 닫기
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess('');
      }, 3000);
    } catch (error) {
      console.error('초대 발송 실패:', error);
      setInviteError(error instanceof Error ? error.message : '초대 발송에 실패했습니다.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmails('');
    setInviteError('');
    setInviteSuccess('');
  };

  // 사용자 아바타 렌더링 함수
  const renderUserAvatars = () => {
    const users = [];
    
    // 트랙 소유자 추가
    if (track.owner_id) {
      users.push({
        id: track.owner_id.id,
        username: track.owner_id.username,
        isOwner: true
      });
    }
    
    // 협업자들 추가
    if (track.collaborators) {
      track.collaborators.forEach(collaborator => {
        if (collaborator.user) {
          users.push({
            id: collaborator.user.id,
            username: collaborator.user.username,
            isOwner: false
          });
        }
      });
    }

    return (
      <div className="flex-shrink-0 flex items-start gap-2">
        {users.map((user) => (
          <div 
            key={user.id}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              user.isOwner ? 'bg-purple-600' : 'bg-gray-500'
            }`}
            title={user.username}
          >
            <span className="text-white text-sm font-medium">
              {user.username.substring(0, 3).toUpperCase()}
            </span>
          </div>
        ))}
        <div 
          className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-500 transition-colors" 
          onClick={onAddCollaborator}
          title="협업자 추가"
        >
          <Plus size={16} className="text-white" />
        </div>
      </div>
    );
  };

  return (
    <div className="mb-12">
      <div className="flex gap-8 mb-6">
        {/* Album Cover */}
        <div className="flex-shrink-0">
          <PresignedImage
            trackId={track.id}
            imageUrl={track.image_url}
            alt={track.title}
            className="w-80 h-80 rounded-lg shadow-lg object-cover"
          />
        </div>

        {/* Track Details */}
        <div className="flex-1">
          <h2 className="text-4xl font-bold text-white mb-2">{track.title}</h2>
          <p className="text-gray-400 text-lg mb-4">{track.created_date}</p>
          <div className="flex gap-6 mb-4">
            <span className="text-gray-400">{track.genre}</span>
            <span className="text-gray-400">{track.bpm}</span>
            <span className="text-gray-400">{track.key_signature}</span>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">{track.owner_id.username}</h3>
            <p className="text-gray-300 leading-relaxed">{track.description}</p>
          </div>

          <div className="mb-6">
            <span className="text-gray-400">Version: {versionNumber}</span>
          </div>

          <div className="flex gap-4 mb-6">
            <Button 
              variant="primary" 
              size="lg" 
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              onClick={handlePlayClick}
              disabled={stemsLoading}
            >
              {stemsLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : showPlayer ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="flex items-center gap-2 bg-[#202426] hover:bg-[#373A3D] text-white"
              onClick={onShowAllStems}
            >
              View All Stems
            </Button>
          </div>

          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-red-600 hover:bg-red-700"
            onClick={() => setShowRollbackConfirm(true)}
          >
            Roll Back
          </Button>
        </div>

        {/* User Avatars */}
        {renderUserAvatars()}
      </div>

      {/* Stem Player */}
      {showPlayer && stems.length > 0 && (
        <div className="mt-6">
          <StemPlayer stems={stems} />
        </div>
      )}

      {/*  Confirm Modal */}
      <ConfirmModal
        isOpen={showRollbackConfirm}
        title="Are you sure you want to roll back?"
        description="All stages created after the selected version will be permanently deleted. This action cannot be undone."
        confirmText="Confirm Rollback"
        cancelText="Cancel"
        onConfirm={() => {
          setShowRollbackConfirm(false);
          if (onRollBack) onRollBack();
        }}
        onCancel={() => setShowRollbackConfirm(false)}
      />

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">협업자 초대</h3>
              <button
                onClick={handleCloseInviteModal}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                이메일 주소 (쉼표 또는 줄바꿈으로 구분)
              </label>
              <textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
                className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={inviteLoading}
              />
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-md">
                <p className="text-red-300 text-sm">{inviteError}</p>
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3 bg-green-900 border border-green-700 rounded-md">
                <p className="text-green-300 text-sm">{inviteSuccess}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleSendInvites}
                disabled={inviteLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {inviteLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '초대 발송'
                )}
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={handleCloseInviteModal}
                disabled={inviteLoading}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackInfoCard;