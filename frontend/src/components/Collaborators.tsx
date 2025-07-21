import React, { useState, useEffect } from 'react';
import { Plus, X, Crown } from 'lucide-react';
import { Button } from './';
import { Track } from '../types/api';
import inviteService from '../services/inviteService';
import apiClient from '../lib/api';

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

  // 역할 편집 관련 state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<TrackUser | null>(null);
  const [newRole, setNewRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [roleSuccess, setRoleSuccess] = useState('');

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

  // 🔧 DEBUG: 모달 상태 변화 감지
  useEffect(() => {
    console.log('🔧 [Collaborators] showInviteModal state changed:', showInviteModal);
  }, [showInviteModal]);

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

  // Owner 권한 확인 함수
  const checkOwnerPermission = async () => {
    try {
      const response = await apiClient.get(`/track-collaborator/is-owner/${track.id}`, {
        withCredentials: true
      });
      return response.data.isOwner;
    } catch (error) {
      console.error('Failed to check owner permission:', error);
      return false;
    }
  };

  // 협업자 클릭 핸들러
  const handleCollaboratorClick = async (collaborator: TrackUser) => {
    const isOwner = await checkOwnerPermission();
    if (!isOwner) {
      alert('권한이 없습니다. 트랙 소유자만 역할을 수정할 수 있습니다.');
      return;
    }

    setSelectedCollaborator(collaborator);
    setNewRole(collaborator.role || '');
    setShowRoleModal(true);
    setRoleError('');
    setRoleSuccess('');
  };

  // 콜라버 추가 버튼 핸들러
  const handleAddCollaboratorClick = async (event?: React.MouseEvent) => {
    console.log('🔧 [Collaborators] Add collaborator button clicked');
    
    // 이벤트 버블링 방지
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    try {
      console.log('🔧 [Collaborators] Checking owner permission...');
      const isOwner = await checkOwnerPermission();
      console.log('🔧 [Collaborators] Is owner:', isOwner);
      
      if (!isOwner) {
        console.warn('🔧 [Collaborators] User is not owner, showing alert');
        alert('권한이 없습니다. 트랙 소유자만 협업자를 추가할 수 있습니다.');
        return;
      }
      
      console.log('🔧 [Collaborators] Setting invite modal to true');
      setShowInviteModal(true);
      console.log('🔧 [Collaborators] Invite modal state should be updated');
    } catch (error) {
      console.error('🔧 [Collaborators] Error in handleAddCollaboratorClick:', error);
      alert('권한 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 역할 수정 함수
  const handleRoleUpdate = async () => {
    if (!selectedCollaborator || !newRole.trim()) {
      setRoleError('역할을 입력해주세요.');
      return;
    }

    if (newRole.trim() === selectedCollaborator.role) {
      setShowRoleModal(false);
      return;
    }

    setRoleLoading(true);
    setRoleError('');
    setRoleSuccess('');

    try {
      const response = await apiClient.put('/track-collaborator/set-role', {
        userId: selectedCollaborator.id,
        trackId: track.id,
        role: newRole.trim()
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        setRoleSuccess('역할이 성공적으로 수정되었습니다.');

        // 트랙 사용자 정보 새로고침
        const trackResponse = await apiClient.get(`/track-collaborator/track-users/${track.id}`, {
          withCredentials: true
        });

        if (trackResponse.data.success) {
          setTrackUsers(trackResponse.data.data);
        }

        setTimeout(() => {
          setShowRoleModal(false);
          setRoleSuccess('');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Failed to update role:', error);
      setRoleError(error.response?.data?.message || '역할 수정에 실패했습니다.');
    } finally {
      setRoleLoading(false);
    }
  };

  // 역할 편집 모달 닫기 함수
  const handleCloseRoleModal = () => {
    setShowRoleModal(false);
    setSelectedCollaborator(null);
    setNewRole('');
    setRoleError('');
    setRoleSuccess('');
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
            {/* 트랙 소유자 - 고정 위치 */}
            <div className='relative group flex-shrink-0'>
              <div className='h-12 w-12 rounded-full border-2 border-yellow-400 overflow-hidden relative'>
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

              {/* Owner Crown - 크라운을 프로필 밖으로 이동 */}
              <div className='absolute -top-2 -right-2 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg border-2 border-white z-10'>
                <Crown size={14} className='text-yellow-800' />
              </div>

              {/* Owner Tooltip */}
              <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20'>
                <div className='bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl border border-gray-700'>
                  <div className='font-semibold'>{trackUsers.owner.username}</div>
                  <div className='text-yellow-400 text-xs'>Owner</div>
                  {/* 화살표 */}
                  <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900'></div>
                </div>
              </div>
            </div>

            {/* 콜라보레이터들 - 스크롤 가능한 영역 */}
            {trackUsers.collaborators.collaborator.length > 0 && (
              <div className="relative flex-1 max-w-xs">
                {/* 스크롤 영역 */}
                <div 
                  className={`flex items-center transition-all duration-300 ${
                    trackUsers.collaborators.collaborator.length > 3 
                      ? 'overflow-x-auto scrollbar-hide space-x-4 px-2 py-1' 
                      : 'space-x-4'
                  }`}
                  style={{
                    scrollBehavior: 'smooth'
                  }}
                  onWheel={(e) => {
                    // 마우스 휠로 좌우 스크롤 가능하게 하기
                    if (trackUsers.collaborators.collaborator.length > 3) {
                      e.preventDefault();
                      e.currentTarget.scrollLeft += e.deltaY;
                    }
                  }}
                >
                  {trackUsers.collaborators.collaborator.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className='relative group flex-shrink-0'
                    >
                      <div
                        className='h-12 w-12 rounded-full cursor-pointer transform transition-all duration-200 hover:scale-110 hover:ring-2 hover:ring-purple-400 overflow-hidden'
                        onClick={() => handleCollaboratorClick(collaborator)}
                      >
                        {collaborator.image_url ? (
                          <img
                            src={collaborator.image_url}
                            alt={collaborator.username}
                            className='h-full w-full object-cover transition-opacity duration-200 hover:opacity-80'
                            onError={(e) => handleImageError(e, collaborator.username)}
                          />
                        ) : (
                          <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600 transition-all duration-200 hover:from-purple-500 hover:to-purple-700'>
                            <span className='text-sm font-semibold text-white'>
                              {collaborator.username?.charAt(0)?.toUpperCase() || 'C'}
                            </span>
                          </div>
                        )}

                        {/* Fallback div */}
                        <div
                          className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600 transition-all duration-200 hover:from-purple-500 hover:to-purple-700'
                          style={{ display: 'none' }}
                        >
                          <span className='text-sm font-semibold text-white'>
                            {collaborator.username?.charAt(0)?.toUpperCase() || 'C'}
                          </span>
                        </div>
                      </div>

                      {/* Collaborator Tooltip */}
                      <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20'>
                        <div className='bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl border border-gray-700'>
                          <div className='font-semibold'>{collaborator.username}</div>
                          <div className='text-purple-400 text-xs'>{collaborator.role || 'collaborator'}</div>
                          {/* 화살표 */}
                          <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900'></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 스크롤 가능 표시 - 우측 그라데이션 */}
                {trackUsers.collaborators.collaborator.length > 3 && (
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900 to-transparent pointer-events-none opacity-60" />
                )}

                {/* 스크롤 힌트 */}
                {trackUsers.collaborators.collaborator.length > 3 && (
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                    스크롤하여 더보기
                  </div>
                )}
              </div>
            )}

            {/* 추가 버튼 - 고정 위치 */}
            <div className="flex-shrink-0">
              <Button 
                onClick={(e) => handleAddCollaboratorClick(e)}
                className="z-10 relative"
              >
                <Plus size={20} />
              </Button>
            </div>
          </>
        ) : (
          // 목업 데이터로 샘플 collaborators 표시 (API 실패 시)
          <>
            <div className='relative group flex-shrink-0'>
              <div className='h-12 w-12 rounded-full border-2 border-yellow-400 overflow-hidden relative'>
                <img
                  src={mockImages[0]}
                  alt='Owner'
                  className='h-full w-full object-cover'
                />
              </div>
              {/* Mock Owner Crown */}
              <div className='absolute -top-2 -right-2 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg border-2 border-white z-10'>
                <Crown size={14} className='text-yellow-800' />
              </div>
              {/* Mock Owner Tooltip */}
              <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20'>
                <div className='bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl border border-gray-700'>
                  <div className='font-semibold'>Sample Owner</div>
                  <div className='text-yellow-400 text-xs'>Owner</div>
                  <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900'></div>
                </div>
              </div>
            </div>

            {/* Mock collaborators with improved scroll */}
            <div className="relative flex-1 max-w-xs">
              <div 
                className="flex overflow-x-auto scrollbar-hide space-x-4 px-2 py-1"
                style={{ scrollBehavior: 'smooth' }}
                onWheel={(e) => {
                  e.preventDefault();
                  e.currentTarget.scrollLeft += e.deltaY;
                }}
              >
                <div className='relative group flex-shrink-0'>
                  <div className='h-12 w-12 overflow-hidden rounded-full'>
                    <img
                      src={mockImages[1]}
                      alt='Sample Collaborator'
                      className='h-full w-full object-cover'
                    />
                  </div>
                  <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20'>
                    <div className='bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl border border-gray-700'>
                      <div className='font-semibold'>Sample User 1</div>
                      <div className='text-purple-400 text-xs'>collaborator</div>
                      <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900'></div>
                    </div>
                  </div>
                </div>

                <div className='relative group flex-shrink-0'>
                  <div className='h-12 w-12 overflow-hidden rounded-full'>
                    <img
                      src={mockImages[2]}
                      alt='Sample Collaborator'
                      className='h-full w-full object-cover'
                    />
                  </div>
                  <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20'>
                    <div className='bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl border border-gray-700'>
                      <div className='font-semibold'>Sample User 2</div>
                      <div className='text-purple-400 text-xs'>collaborator</div>
                      <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900'></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock scroll indicator */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900 to-transparent pointer-events-none opacity-60" />
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                스크롤하여 더보기
              </div>
            </div>

            {/* 추가 버튼 - 고정 위치 */}
            <div className='flex-shrink-0'>
              <Button 
                onClick={(e) => handleAddCollaboratorClick(e)}
                className="z-10 relative"
              >
                <Plus size={20} />
              </Button>
            </div>
          </>
        )}
      </div>
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

      {/* Role Edit Modal */}
      {showRoleModal && selectedCollaborator && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4'>
          <div className='mx-4 w-full max-w-sm rounded-lg bg-gray-800 p-4 sm:max-w-md md:p-6'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-white sm:text-xl'>
                Edit Role
              </h3>
              <button
                onClick={handleCloseRoleModal}
                className='p-1 text-gray-400 hover:text-white'
                disabled={roleLoading}
              >
                <X size={20} />
              </button>
            </div>

            <div className='mb-4'>
              <div className='mb-4 flex items-center space-x-3'>
                <div className='relative h-10 w-10 overflow-hidden rounded-full'>
                  {selectedCollaborator.image_url ? (
                    <img
                      src={selectedCollaborator.image_url}
                      alt={selectedCollaborator.username}
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600'>
                      <span className='text-sm font-semibold text-white'>
                        {selectedCollaborator.username?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className='text-white font-medium'>{selectedCollaborator.username}</p>
                  <p className='text-gray-400 text-sm'>{selectedCollaborator.email}</p>
                </div>
              </div>

              <label className='mb-2 block text-sm font-medium text-gray-300'>
                Role
              </label>
              <input
                type='text'
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder={selectedCollaborator.role || 'collaborator'}
                className='w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500'
                disabled={roleLoading}
              />
              <p className='mt-1 text-xs text-gray-400'>
                Current role: {selectedCollaborator.role || 'collaborator'}
              </p>
            </div>

            {roleError && (
              <div className='mb-4 rounded-md border border-red-700 bg-red-900 p-3'>
                <p className='text-sm text-red-300'>{roleError}</p>
              </div>
            )}

            {roleSuccess && (
              <div className='mb-4 rounded-md border border-green-700 bg-green-900 p-3'>
                <p className='text-sm text-green-300'>{roleSuccess}</p>
              </div>
            )}

            <div className='flex gap-3'>
              <Button
                variant='primary'
                size='md'
                onClick={handleRoleUpdate}
                disabled={roleLoading || !newRole.trim()}
                className='flex-1 bg-purple-600 hover:bg-purple-700'
              >
                {roleLoading ? (
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                ) : (
                  'Edit Role'
                )}
              </Button>
              <Button
                variant='outline'
                size='md'
                onClick={handleCloseRoleModal}
                disabled={roleLoading}
                className='flex-1'
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Collaborators;
