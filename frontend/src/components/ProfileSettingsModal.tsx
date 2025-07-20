import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, User, Upload } from 'lucide-react';
import { Button } from './';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import apiClient from '../lib/api';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  
  // 상태 관리
  const [name, setName] = useState(user?.username || '');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [currentProfileImageUrl, setCurrentProfileImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfileImage, setIsLoadingProfileImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 현재 프로필 이미지 가져오기
  const fetchCurrentProfileImage = async () => {
    if (!user) return;
    
    setIsLoadingProfileImage(true);
    try {
      console.log('🖼️ [ProfileSettingsModal] Fetching current profile image...');
      const response = await apiClient.get('/users/me/profile-image', {
        withCredentials: true
      });
      
      console.log('🖼️ [ProfileSettingsModal] Profile image response:', response.data);
      
      if (response.data.success && response.data.data.imageUrl) {
        setCurrentProfileImageUrl(response.data.data.imageUrl);
        console.log('🖼️ [ProfileSettingsModal] Profile image URL set:', response.data.data.imageUrl);
      } else {
        setCurrentProfileImageUrl(null);
        console.log('🖼️ [ProfileSettingsModal] No profile image found');
      }
    } catch (error) {
      console.error('🖼️ [ProfileSettingsModal] Failed to fetch profile image:', error);
      setCurrentProfileImageUrl(null);
    } finally {
      setIsLoadingProfileImage(false);
    }
  };

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen && user) {
      setName(user.username || '');
      setSelectedImage(null);
      setPreviewUrl('');
      setCurrentProfileImageUrl(null);
      // 현재 프로필 이미지 가져오기
      fetchCurrentProfileImage();
    }
  }, [isOpen, user]);

  // 파일 선택 핸들러
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      showToast('error', '이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', '파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setSelectedImage(file);
    
    // 미리보기 URL 생성
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // 드래그 앤 드롭 핸들러
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        showToast('error', '이미지 파일만 업로드 가능합니다.');
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // 완료 버튼 핸들러
  const handleComplete = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const updateData: any = {};
      
      // 이름 변경이 있는 경우
      if (name !== user.username) {
        updateData.name = name;
      }
      
      // 이미지 업로드가 있는 경우
      if (selectedImage) {
        updateData.profileImage = selectedImage;
      }
      
      // 변경사항이 없는 경우
      if (Object.keys(updateData).length === 0) {
        showToast('info', '변경사항이 없습니다.');
        onClose();
        return;
      }

      // 프로필 업데이트 실행
      await updateProfile(updateData);
      showToast('success', '프로필이 성공적으로 업데이트되었습니다.');
      onClose();
      
    } catch (error) {
      console.error('Profile update failed:', error);
      showToast('error', '프로필 업데이트에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 현재 프로필 이미지 URL 가져오기
  const getCurrentProfileImageUrl = () => {
    // 새로 선택한 이미지의 미리보기가 우선
    if (previewUrl) return previewUrl;
    // 서버에서 가져온 현재 프로필 이미지 URL
    if (currentProfileImageUrl) return currentProfileImageUrl;
    return null;
  };

  // 사용자 초성 가져오기
  const getUserInitial = () => {
    if (name) return name.charAt(0).toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    return 'U';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">프로필 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 프로필 이미지 섹션 */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              프로필 이미지
            </label>
            
            {/* 이미지 미리보기 */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  {isLoadingProfileImage ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : getCurrentProfileImageUrl() ? (
                    <img
                      src={getCurrentProfileImageUrl()!}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('🖼️ [ProfileSettingsModal] Image load error:', e);
                        setCurrentProfileImageUrl(null);
                      }}
                    />
                  ) : (
                    <span className="text-white text-xl font-semibold">
                      {getUserInitial()}
                    </span>
                  )}
                </div>
                
                {/* 카메라 아이콘 */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Camera size={16} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* 드래그 앤 드롭 영역 */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                이미지를 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG 파일 (최대 5MB)
              </p>
            </div>

            {/* 숨겨진 파일 입력 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* 이름 입력 섹션 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              이름
            </label>
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="이름을 입력하세요"
              />
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
          >
            취소
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                저장 중...
              </div>
            ) : (
              '완료'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsModal;