import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, User, LogOut } from 'lucide-react';
import Button from './Button';
import ProfileSettingsModal from './ProfileSettingsModal';
import { useAuth } from '../contexts/AuthContext';

/**
 * SettingsDropdown component
 * Render a settings icon button that toggles a dropdown menu with profile settings and logout actions.
 * This logic was originally duplicated inside TrackHeader and is now extracted for reuse across pages.
 */
const SettingsDropdown = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Dropdown & modal state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Ref for detecting outside clicks
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleLogoutClick = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout failed:', error);
    }
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Settings icon button */}
      <Button size="sm" className="p-2 bg-black text-white" onClick={handleToggleDropdown}>
        <Settings size={20} />
      </Button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <button
              onClick={handleProfileClick}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              <User size={16} />
              프로필 설정
            </button>
            <button
              onClick={handleLogoutClick}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </div>
      )}

      {/* Profile settings modal */}
      <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
};

export default SettingsDropdown; 