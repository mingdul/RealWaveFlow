import React from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { Button } from './';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useNavigate } from 'react-router-dom';

interface TrackHeaderProps {
  onBack?: () => void;
  onSettingsClick?: () => void;
}

const TrackHeader: React.FC<TrackHeaderProps> = ({
  onBack,
  onSettingsClick,
}) => {
  const navigate = useNavigate();
  return (
    <div className="bg-black px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button size="sm" className="p-2 bg-black text-white" onClick={onBack}>
          <ChevronLeft size={20} />
        </Button>
        <Logo />
      </div>
      <div className="flex space-x-4">
        <nav
          className="text-white text-sm"
          onClick={() => navigate(`/dashboard`)}
        >
          Dashboard
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <Button size="sm" className="p-2 bg-black text-white" onClick={onSettingsClick}>
          <Settings size={20} />
        </Button>
      </div>
    </div>
  );
};

export default TrackHeader; 