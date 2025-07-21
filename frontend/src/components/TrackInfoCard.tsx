import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { Button } from './';
import { Track } from '../types/api';
import streamingService, {
  StemStreamingInfo,
} from '../services/streamingService';
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
    if (
      trimmedEmail &&
      validateEmail(trimmedEmail) &&
      !emailList.includes(trimmedEmail)
    ) {
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
  const handleInputChange = (e: any) => {
    setCurrentInput(e.target.value);
  };

  const handleInputKeyDown = (e: any) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(currentInput);
    } else if (
      e.key === 'Backspace' &&
      currentInput === '' &&
      emailList.length > 0
    ) {
      removeEmail(emailList.length - 1);
    }
  };

  // 붙여넣기 핸들러
  const handlePaste = (e: any) => {
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
        setInviteSuccess(
          `${result.sent_count}개의 초대가 성공적으로 발송되었습니다.`
        );

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
      setInviteError(
        error.message || '초대 발송에 실패했습니다. 다시 시도해주세요.'
      );
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
        const response =
          await streamingService.getGuidePresignedUrlByStageId(stageId);

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

  return (
    <div className='rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:shadow-2xl'>
      <div className='flex flex-col gap-6 lg:flex-row'>
        {/* Album Cover */}
        <div className='flex-shrink-0'>
          <div className='group relative'>
            <PresignedImage
              trackId={track.id}
              imageUrl={track.image_url}
              alt={track.title}
              className='h-48 w-48 object-cover shadow-lg transition-transform duration-300 group-hover:scale-105 lg:h-56 lg:w-56'
            />
            <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
              <button
                onClick={handlePlayClick}
                className='rounded-full bg-white/20 p-4 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30'
              >
                {isPlaying ? (
                  <Pause className='h-8 w-8 text-white' />
                ) : (
                  <Play className='ml-1 h-8 w-8 text-white' />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Track Details */}
        <div className='min-w-0 flex-1'>
          <h2 className='mb-2 text-2xl font-bold text-white sm:text-3xl lg:text-4xl'>
            {track.title}
          </h2>
          <p className='mb-3 text-sm text-gray-400 sm:text-base md:mb-4 lg:text-lg'>
            {new Date(track.created_date).toLocaleDateString('en-US')}
          </p>
          <div className='mb-3 flex flex-wrap gap-2 md:mb-4'>
            <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 sm:text-sm md:px-3 md:py-1'>
              {track.genre}
            </span>
            <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 sm:text-sm md:px-3 md:py-1'>
              {track.bpm} bpm
            </span>
            <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 sm:text-sm md:px-3 md:py-1'>
              {track.key_signature} key
            </span>
          </div>

          <div className='mb-4 md:mb-6'>
            <h3 className='mb-2 text-base font-semibold text-white sm:text-lg'>
              Owner: {track.owner_id.username}
            </h3>
            <p className='text-sm leading-relaxed text-gray-300 sm:text-base'>
              Description: {track.description}
            </p>
          </div>

          <div className='mb-4 md:mb-6'>
            <h4 className='text-sm font-bold text-gray-400 sm:text-base'>
              Version: {versionNumber}
            </h4>
          </div>

          <div className='mb-4 flex flex-col gap-3 sm:flex-row md:mb-6 md:gap-4'>
            <Button
              variant='primary'
              size='lg'
              className='flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 hover:bg-purple-700 sm:w-auto'
              onClick={handlePlayClick}
              disabled={stemsLoading || guideLoading}
            >
              {stemsLoading || guideLoading ? (
                <div className='h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent' />
              ) : isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </Button>
            <Button
              variant='waveflowbtn'
              size='lg'
              className='flex w-full items-center gap-2 rounded-full sm:w-auto'
              onClick={handleShowAllStems}
            >
              View All Stems
            </Button>
          </div>
        </div>
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
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4'>
          <div className='mx-4 w-full max-w-sm rounded-lg bg-gray-800 p-4 sm:max-w-md md:p-6 lg:max-w-lg'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-white sm:text-xl'>
                Invite Collaborators
              </h3>
              <button
                onClick={handleCloseInviteModal}
                className='p-1 text-gray-400 hover:text-white'
              >
                <X size={20} />
              </button>
            </div>

            <div className='mb-4'>
              <label className='mb-2 block text-sm font-medium text-gray-300'>
                Emails ({emailList.length} emails)
              </label>
              <div className='min-h-[100px] rounded-md border border-gray-600 bg-gray-700 px-3 py-2 focus-within:border-transparent focus-within:ring-2 focus-within:ring-purple-500 sm:min-h-[120px]'>
                <div className='mb-2 flex flex-wrap gap-2'>
                  {emailList.map((email, index) => (
                    <span
                      key={index}
                      className='inline-flex items-center gap-1 rounded-full bg-purple-600 px-2 py-1 text-sm text-white'
                    >
                      {email}
                      <button
                        onClick={() => removeEmail(index)}
                        className='rounded-full p-0.5 hover:bg-purple-700'
                        disabled={inviteLoading}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type='text'
                  value={currentInput}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  onPaste={handlePaste}
                  placeholder={
                    emailList.length === 0
                      ? 'Enter or comma to add email'
                      : 'Add email...'
                  }
                  className='w-full bg-transparent text-white placeholder-gray-400 focus:outline-none'
                  disabled={inviteLoading}
                />
              </div>
              <p className='mt-1 text-xs text-gray-400'>
                Paste multiple emails or enter/comma to separate
              </p>
            </div>

            {inviteError && (
              <div className='mb-4 rounded-md border border-red-700 bg-red-900 p-3'>
                <p className='text-sm text-red-300'>{inviteError}</p>
              </div>
            )}

            {inviteSuccess && (
              <div className='mb-4 rounded-md border border-green-700 bg-green-900 p-3'>
                <p className='text-sm text-green-300'>{inviteSuccess}</p>
              </div>
            )}

            <div className='flex gap-3'>
              <Button
                variant='primary'
                size='md'
                onClick={handleSendInvites}
                disabled={inviteLoading || emailList.length === 0}
                className='flex-1 bg-purple-600 hover:bg-purple-700'
              >
                {inviteLoading ? (
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                ) : (
                  `Invite (${emailList.length} people)`
                )}
              </Button>
              <Button
                variant='outline'
                size='md'
                onClick={handleCloseInviteModal}
                disabled={inviteLoading}
                className='flex-1'
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackInfoCard;