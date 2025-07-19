import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from './';
import { Track } from '../types/api';
import inviteService from '../services/inviteService';

interface CollaboratorsProps {
  track: Track;
}

const Collaborators: React.FC<CollaboratorsProps> = ({ track }) => {
  // 초대 관련 state
  const [showInviteModal, setShowInviteModal] = useState(false);
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

  // 초대 발송 함수
  const handleSendInvites = async () => {
    if (emailList.length === 0) {
      setInviteError('최소 하나의 이메일을 입력해주세요.');
      return;
    }

    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const result = await inviteService.sendTrackInvites(track.id, emailList);
      
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

  // 모달 닫기 함수
  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setEmailList([]);
    setCurrentInput('');
    setInviteError('');
    setInviteSuccess('');
  };

  return (
    <>
      {/* Collaborators Card */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 shadow-md mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">Collaborators</h3>
        <div className="space-y-3">
          {/* 트랙 소유자 */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {track.owner_id?.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-base text-white">{track.owner_id?.username || 'Unknown User'}</p>
              <p className="text-sm text-gray-400">Owner</p>
            </div>
          </div>
          
          {/* 콜라보레이터들 */}
          {track.collaborators && track.collaborators.length > 0 ? (
            track.collaborators.map((collaborator, _index) => (
              <div key={collaborator.id} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {collaborator.user_id?.username?.charAt(0)?.toUpperCase() || 'C'}
                  </span>
                </div>
                <div>
                  <p className="text-base text-white">{collaborator.user_id?.username || 'Unknown Collaborator'}</p>
                  <p className="text-sm text-gray-400">
                    {collaborator.role} • {collaborator.status}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">No collaborators yet</p>
          )}
        </div>
        <div className='flex justify-center mt-4'>
          <Button
            variant='outline'
            size='lg'
            className='flex w-full items-center gap-2 rounded-full border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-black sm:w-auto'
            onClick={() => setShowInviteModal(true)}
          >
            <Plus size={20} />
            Invite Collaborators
          </Button>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4'>
          <div className='mx-4 w-full max-w-sm rounded-lg bg-gray-800 p-4 sm:max-w-md md:p-6 lg:max-w-lg'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-white sm:text-xl'>
                협업자 초대
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
                이메일 주소 ({emailList.length}개)
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
                      ? '이메일을 입력하고 Enter 또는 쉼표를 눌러주세요'
                      : '이메일 추가...'
                  }
                  className='w-full bg-transparent text-white placeholder-gray-400 focus:outline-none'
                  disabled={inviteLoading}
                />
              </div>
              <p className='mt-1 text-xs text-gray-400'>
                여러 이메일을 붙여넣거나 Enter/쉼표로 구분해서 입력하세요
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
                  `초대 발송 (${emailList.length}명)`
                )}
              </Button>
              <Button
                variant='outline'
                size='md'
                onClick={handleCloseInviteModal}
                disabled={inviteLoading}
                className='flex-1'
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Collaborators; 