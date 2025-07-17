import React, { useEffect, useState, useRef } from 'react';
import { Play, Plus, Pause, X } from 'lucide-react';
import { Button } from './';
import { Track } from '../types/api';
import streamingService, { StemStreamingInfo } from '../services/streamingService';
import PresignedImage from './PresignedImage';
import inviteService from '../services/inviteService';

interface TrackInfoCardProps {
  track: Track;
  stems?: StemStreamingInfo[];
  onPlay?: () => void;
  onShowAllStems?: () => void;
  onRollBack?: () => void;
  stemsLoading?: boolean;
  versionNumber?: string;
  stageId?: string;
  guideUrl?: string;
}

const TrackInfoCard: React.FC<TrackInfoCardProps> = ({
  track,
  onShowAllStems,
  versionNumber,
  stemsLoading = false,
  stageId,

}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [guideUrl, setGuideUrl] = useState<string | undefined>(undefined);
  const [guideLoading, setGuideLoading] = useState(false);
  const guideAudioRef = useRef<HTMLAudioElement>(null);


  //const [inviteEmails, setInviteEmails] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  
const [emailList, setEmailList] = useState<string[]>([]);
const [currentInput, setCurrentInput] = useState('');

// 이메일 유효성 검사 함수
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 이메일 추가 함수
const addEmail = (email: string) => {
  const trimmedEmail = email.trim();
  if (trimmedEmail && validateEmail(trimmedEmail) && !emailList.includes(trimmedEmail)) {
    setEmailList([...emailList, trimmedEmail]);
    setCurrentInput('');
    setInviteError('');
    return true;
  } else if (trimmedEmail && !validateEmail(trimmedEmail)) {
    setInviteError('유효하지 않은 이메일 형식입니다.');
    return false;
  } else if (emailList.includes(trimmedEmail)) {
    setInviteError('이미 추가된 이메일입니다.');
    return false;
  }
  return false;
};

// 이메일 삭제 함수
const removeEmail = (index: number) => {
  setEmailList(emailList.filter((_, i) => i !== index));
  setInviteError('');
};

// 입력 핸들러
const handleInputChange = (e : any) => {
  setCurrentInput(e.target.value);
};

const handleInputKeyDown = (e : any) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addEmail(currentInput);
  } else if (e.key === 'Backspace' && currentInput === '' && emailList.length > 0) {
    removeEmail(emailList.length - 1);
  }
};

// 붙여넣기 핸들러
const handlePaste = (e : any) => {
  e.preventDefault();
  const pastedText = e.clipboardData.getData('text');
  const pastedEmails = pastedText
    .split(/[,\n\r\s]+/)
    .map((email: string) => email.trim())
    .filter((email: string) => email && validateEmail(email))
    .filter((email: string) => !emailList.includes(email));
  
  if (pastedEmails.length > 0) {
    setEmailList([...emailList, ...pastedEmails]);
    setCurrentInput('');
    setInviteError('');
  }
};

// 초대 발송 함수 수정
const handleSendInvites = async () => {
  if (emailList.length === 0) {
    setInviteError('최소 하나의 이메일을 입력해주세요.');
    return;
  }

  setInviteLoading(true);
  setInviteError('');
  setInviteSuccess('');

  try {
    // 실제 API 호출
    const result = await inviteService.sendTrackInvites(track.id, emailList);
    console.log(stageId);
    if (result.success) {
      setInviteSuccess(`${result.sent_count}개의 초대가 성공적으로 발송되었습니다.`);
      
      // 성공 시 이메일 목록 초기화
      setEmailList([]);
      setCurrentInput('');
      
      // 3초 후 모달 닫기
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess('');
      }, 3000);
    } else {
      setInviteError(result.message || '초대 발송에 실패했습니다.');
    }
    
  } catch (error: any) {
    console.error('초대 발송 실패:', error);
    setInviteError(error.message || '초대 발송에 실패했습니다. 다시 시도해주세요.');
  } finally {
    setInviteLoading(false);
  }
};

// 모달 닫기 함수 수정
const handleCloseInviteModal = () => {
  setShowInviteModal(false);
  setEmailList([]);
  setCurrentInput('');
  setInviteError('');
  setInviteSuccess('');
};


  const handlePlayClick = async () => {
  if (!isPlaying && stageId) {
    try {
      setGuideLoading(true);
      const response = await streamingService.getGuidePresignedUrlByStageId(stageId);
      
      console.log('Guide API response:', response);
      
      if (response.success && response.data) {
        setGuideUrl(response.data.presignedUrl);
        setIsPlaying(true);
      } else {
        console.error('Failed to fetch guide:', response.message);
      }
    } catch (error) {
      console.error('Error fetching guide:', error);
    } finally {
      setGuideLoading(false);
    }
  } else {
    // 정지
    if (guideAudioRef.current) {
      guideAudioRef.current.pause();
      guideAudioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setGuideUrl(undefined);
  }
};

useEffect(() => {
  const guideAudio = guideAudioRef.current;
  if (!guideAudio || !guideUrl) return;

  if (isPlaying) {
    guideAudio.play().catch(console.error);
  } else {
    guideAudio.pause();
  }
}, [isPlaying, guideUrl]);

  const handleShowAllStems = () => {
    if (onShowAllStems) {
      onShowAllStems();
    }
  };

  const onAddCollaborator = () => {
    setShowInviteModal(true);
    //setInviteEmails('');
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
    
    // 협업자들 추가 (accepted 상태인 것만)
    if (track.collaborators) {
      track.collaborators.forEach(collaborator => {
        if (collaborator.user_id && collaborator.status === 'accepted') {
          users.push({
            id: collaborator.user_id.id,
            username: collaborator.user_id.username,
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
    <div className="mb-6 md:mb-12">
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8 mb-4 md:mb-6">
        {/* Album Cover */}
        <div className="flex-shrink-0 self-center lg:self-start">
          <PresignedImage
            trackId={track.id}
            imageUrl={track.image_url}
            alt={track.title}
            className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 rounded-lg shadow-lg object-cover"
          />
        </div>

        {/* Track Details */}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">{track.title}</h2>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg mb-3 md:mb-4">{new Date(track.created_date).toLocaleDateString('en-US')}</p>
          <div className="flex gap-2 mb-3 md:mb-4 flex-wrap">
            <span className="px-2 py-1 md:px-3 md:py-1 bg-gray-100 text-xs sm:text-sm text-gray-600 rounded-full">{track.genre}</span>
            <span className="px-2 py-1 md:px-3 md:py-1 bg-gray-100 text-xs sm:text-sm text-gray-600 rounded-full">{track.bpm} bpm</span>
            <span className="px-2 py-1 md:px-3 md:py-1 bg-gray-100 text-xs sm:text-sm text-gray-600 rounded-full">{track.key_signature} key</span>
          </div>

          <div className="mb-4 md:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Owner: {track.owner_id.username}</h3>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">Description: {track.description}</p>
          </div>

          <div className="mb-4 md:mb-6">
            <h4 className="text-gray-400 font-bold text-sm sm:text-base">Version: {versionNumber}</h4>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <Button 
              variant="primary" 
              size="lg" 
              className="rounded-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
              onClick={handlePlayClick}
              disabled={stemsLoading || guideLoading}
            >
              {stemsLoading || guideLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </Button>
            <Button 
              variant="waveflowbtn" 
              size="lg"
              className="rounded-full flex items-center gap-2 w-full sm:w-auto"
              onClick={handleShowAllStems}
            >
              View All Stems
            </Button>
          </div>
        </div>

        {/* User Avatars */}
        {renderUserAvatars()}
      </div>

      

      {/* Hidden Audio Element for Guide Playback */}
      {guideUrl && (
        <audio
          ref={guideAudioRef}
          src={guideUrl}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error('Audio playback error:', e);
            setIsPlaying(false);
            setGuideUrl(undefined);
          }}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 w-full max-w-sm sm:max-w-md lg:max-w-lg mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-white">협업자 초대</h3>
            <button
              onClick={handleCloseInviteModal}
              className="text-gray-400 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              이메일 주소 ({emailList.length}개)
            </label>
            <div className="min-h-[100px] sm:min-h-[120px] px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent">
              <div className="flex flex-wrap gap-2 mb-2">
                {emailList.map((email, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-sm rounded-full"
                  >
                    {email}
                    <button
                      onClick={() => removeEmail(index)}
                      className="hover:bg-purple-700 rounded-full p-0.5"
                      disabled={inviteLoading}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={currentInput}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onPaste={handlePaste}
                placeholder={emailList.length === 0 ? "이메일을 입력하고 Enter 또는 쉼표를 눌러주세요" : "이메일 추가..."}
                className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none"
                disabled={inviteLoading}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              여러 이메일을 붙여넣거나 Enter/쉼표로 구분해서 입력하세요
            </p>
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
              disabled={inviteLoading || emailList.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {inviteLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                `초대 발송 (${emailList.length}명)`
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


