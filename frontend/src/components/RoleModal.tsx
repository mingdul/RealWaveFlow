import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from './';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: string) => void;
  currentRole?: string;
  username: string;
  isOwner: boolean;
}

const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentRole,
  username,
  isOwner
}) => {
  const [role, setRole] = useState(currentRole || '');
  const [loading, setLoading] = useState(false);

  const predefinedRoles = [
    'BeatMaker',
    'Producer', 
    'Vocal',
    'Rapper',
    'Mix&Master Engineer'
  ];

  const handleSave = async () => {
    if (role.trim().length === 0 || role.length > 15) {
      return;
    }
    
    setLoading(true);
    try {
      await onSave(role.trim());
      onClose();
    } catch (error) {
      console.error('역할 설정 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && role.trim().length > 0 && role.length <= 15) {
      e.preventDefault();
      handleSave();
    }
  };

  const selectPredefinedRole = (selectedRole: string) => {
    setRole(selectedRole);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="mx-4 w-full max-w-sm rounded-lg bg-gray-800 p-4 sm:max-w-md md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white sm:text-xl">
            {username}의 역할 설정
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {!isOwner && (
          <div className="mb-4 rounded-md border border-yellow-700 bg-yellow-900 p-3">
            <p className="text-sm text-yellow-300">
              트랙 소유자만 역할을 수정할 수 있습니다.
            </p>
          </div>
        )}

        {/* 현재 역할 표시 */}
        {currentRole && (
          <div className="mb-4">
            <span className="text-sm text-gray-400">현재 역할:</span>
            <div className="mt-1">
              <span className="inline-flex items-center rounded-full bg-purple-600 px-3 py-1 text-sm text-white">
                {currentRole}
              </span>
            </div>
          </div>
        )}

        {/* 미리 정의된 역할들 */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            추천 역할
          </label>
          <div className="flex flex-wrap gap-2">
            {predefinedRoles.map((predefinedRole) => (
              <button
                key={predefinedRole}
                onClick={() => selectPredefinedRole(predefinedRole)}
                disabled={!isOwner || loading}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  role === predefinedRole
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } ${(!isOwner || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {predefinedRole}
              </button>
            ))}
          </div>
        </div>

        {/* 사용자 정의 역할 입력 */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            역할 입력 (최대 15자)
          </label>
          <div className="relative">
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="역할을 입력하고 Enter를 누르세요"
              maxLength={15}
              disabled={!isOwner || loading}
              className={`w-full rounded-md border bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
                role.length > 15 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-600 focus:ring-purple-500'
              } ${(!isOwner || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <div className="absolute right-2 top-2 text-xs text-gray-400">
              {role.length}/15
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={!isOwner || loading || role.trim().length === 0 || role.length > 15}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check size={16} className="mr-2" />
                저장
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoleModal;