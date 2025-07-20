import React, { useState, useEffect } from 'react';
import { Plus, X, Crown } from 'lucide-react';
import { Button } from './';
import { Track } from '../types/api';
import inviteService from '../services/inviteService';
import apiClient from '../lib/api';
import RoleModal from './RoleModal';

interface CollaboratorsProps {
  track: Track;
}

interface TrackUser {
  id: string;
  email: string;
  username: string;
  image_url: string | null;
  role?: string;
}

interface TrackUsersData {
  owner: TrackUser;
  collaborators: {
    collaborator: TrackUser[];
  };
}

const Collaborators: React.FC<CollaboratorsProps> = ({ track }) => {
  // API 데이터 state
  const [trackUsers, setTrackUsers] = useState<TrackUsersData | null>(null);
  const [loading, setLoading] = useState(true);

  // 초대 관련 state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');

  // 역할 설정 관련 state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TrackUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);

  // API에서 트랙 사용자 정보 가져오기
  useEffect(() => {
    const fetchTrackUsers = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/track-collaborator/track-users/${track.id}`, {
          withCredentials: true
        });
        
        if (response.data.success) {
          setTrackUsers(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch track users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (track.id) {
      fetchTrackUsers();
    }
  }, [track.id]);

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await apiClient.get('/auth/me', {
          withCredentials: true
        });
        if (response.data.success) {
          setCurrentUserId(response.data.data.id);
          // 현재 사용자가 트랙 소유자인지 확인
          if (trackUsers?.owner?.id === response.data.data.id) {
            setIsCurrentUserOwner(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    fetchCurrentUser();
  }, [trackUsers]);

  // 역할 설정 핸들러
  const handleUserClick = (user: TrackUser) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const handleRoleSave = async (newRole: string) => {
    if (!selectedUser || !currentUserId) return;

    try {
      const response = await apiClient.put(
        `/track-collaborator/track/${track.id}/user/${selectedUser.id}/role`,
        { role: newRole },
        { withCredentials: true }
      );

      if (response.data.success) {
        // 성공 시 로컬 state 업데이트
        setTrackUsers(prev => {
          if (!prev) return prev;
          
          // Owner 업데이트
          if (prev.owner.id === selectedUser.id) {
            return {
              ...prev,
              owner: { ...prev.owner, role: newRole }
            };
          }
          
          // Collaborator 업데이트
          const updatedCollaborators = prev.collaborators.collaborator.map(collab => 
            collab.id === selectedUser.id 
              ? { ...collab, role: newRole }
              : collab
          );
          
          return {
            ...prev,
            collaborators: {
              collaborator: updatedCollaborators
            }
          };
        });
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      throw error;
    }
  };

  // 목업 데이터 - fallback용
  const mockImages = [
    '/person/1750813233213.jpg',
    '/person/IMG_2052.jpg',
    '/person/IMG_6287.jpg',
    '/person/IMG_6287.png',
  ];

  // 이미지 에러 핸들링을 위한 fallback
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
    _username: string
  ) => {
    const target = e.target as HTMLImageElement;
    // 이미지 로드 실패 시 기존 방식(첫 글자)으로 fallback
    target.style.display = 'none';
    const fallbackDiv = target.nextElementSibling as HTMLElement;
    if (fallbackDiv) {
      fallbackDiv.style.display = 'flex';
    }
  };

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

  if (loading) {
    return (
      <div className='flex items-center space-x-4'>
        {/* Loading skeleton */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className='h-12 w-12 animate-pulse rounded-full bg-gray-600'></div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Collaborators Card */}
      <div className='flex items-center space-x-4'>
        {trackUsers ? (
          <>
            {/* 트랙 소유자 */}
            <div className='relative flex flex-col items-center space-y-1'>
              <div 
                className='relative h-12 w-12 overflow-hidden rounded-full border-2 border-yellow-400 cursor-pointer hover:scale-105 transition-transform'
                onClick={() => handleUserClick(trackUsers.owner)}
              >
                {trackUsers.owner.image_url ? (
                  <img
                    src={trackUsers.owner.image_url}
                    alt={trackUsers.owner.username}
                    className='h-full w-full object-cover'
                    onError={(e) => handleImageError(e, trackUsers.owner.username)}
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600'>
                    <span className='text-sm font-semibold text-white'>
                      {trackUsers.owner.username?.charAt(0)?.toUpperCase() || 'O'}
                    </span>
                  </div>
                )}
                
                {/* Owner Crown */}
                <div className='absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center'>
                  <Crown size={12} className='text-yellow-800' />
                </div>
                
                {/* Fallback div */}
                <div
                  className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600'
                  style={{ display: 'none' }}
                >
                  <span className='text-sm font-semibold text-white'>
                    {trackUsers.owner.username?.charAt(0)?.toUpperCase() || 'O'}
                  </span>
                </div>
              </div>
              
              {/* 역할 표시 */}
              {trackUsers.owner.role && (
                <div className='px-2 py-1 text-xs bg-yellow-600 text-white rounded-full max-w-[80px] truncate'>
                  {trackUsers.owner.role}
                </div>
              )}
            </div>

            {/* 콜라보레이터들 */}
            {trackUsers.collaborators.collaborator.map((collaborator) => (
              <div
                key={collaborator.id}
                className='relative flex flex-col items-center space-y-1'
              >
                <div 
                  className='relative h-12 w-12 overflow-hidden rounded-full cursor-pointer hover:scale-105 transition-transform'
                  onClick={() => handleUserClick(collaborator)}
                >
                  {collaborator.image_url ? (
                    <img
                      src={collaborator.image_url}
                      alt={collaborator.username}
                      className='h-full w-full object-cover'
                      onError={(e) => handleImageError(e, collaborator.username)}
                    />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600'>
                      <span className='text-sm font-semibold text-white'>
                        {collaborator.username?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    </div>
                  )}
                  
                  {/* Fallback div */}
                  <div
                    className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600'
                    style={{ display: 'none' }}
                  >
                    <span className='text-sm font-semibold text-white'>
                      {collaborator.username?.charAt(0)?.toUpperCase() || 'C'}
                    </span>
                  </div>
                </div>
                
                {/* 역할 표시 */}
                {collaborator.role && (
                  <div className='px-2 py-1 text-xs bg-purple-600 text-white rounded-full max-w-[80px] truncate'>
                    {collaborator.role}
                  </div>
                )}
              </div>
            ))}
            
            <Button onClick={() => setShowInviteModal(true)}>
              <Plus size={20} />
            </Button>
          </>
        ) : (
          // 목업 데이터로 샘플 collaborators 표시 (API 실패 시)
          <>
            <div className='relative h-12 w-12 overflow-hidden rounded-full border-2 border-yellow-400'>
              <img
                src={mockImages[0]}
                alt='Owner'
                className='h-full w-full object-cover'
              />
              <div className='absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center'>
                <Crown size={12} className='text-yellow-800' />
              </div>
            </div>

            <div className='h-12 w-12 overflow-hidden rounded-full'>
              <img
                src={mockImages[1]}
                alt='Sample Collaborator'
                className='h-full w-full object-cover'
              />
            </div>

            <div className='h-12 w-12 overflow-hidden rounded-full'>
              <img
                src={mockImages[2]}
                alt='Sample Collaborator'
                className='h-full w-full object-cover'
              />
            </div>

            <Button onClick={() => setShowInviteModal(true)}>
              <Plus size={20} />
            </Button>
          </>
        )}
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

      {/* Role Modal */}
      {selectedUser && (
        <RoleModal
          isOpen={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
          }}
          onSave={handleRoleSave}
          currentRole={selectedUser.role}
          username={selectedUser.username}
          isOwner={isCurrentUserOwner}
        />
      )}
    </>
  );
};

export default Collaborators;
