import React from 'react';
import { ChevronLeft, Bell, Settings } from 'lucide-react';
import { Button } from './';
import Logo from './Logo';
import { useNavigate } from 'react-router-dom';

interface TrackHeaderProps {
  onBack?: () => void;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;

}

const TrackHeader: React.FC<TrackHeaderProps> = ({
  onBack,
  onNotificationClick,
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
        <button
          className="text-white text-sm"
          onClick={() => navigate(`/dashboard`)}
        >
          Dashboard
        </button>

      </div>
      <div className="flex items-center gap-4">
        <Button size="sm" className="p-2 bg-black text-white" onClick={onNotificationClick}>
          <Bell size={20} />
        </Button>
        <Button size="sm" className="p-2 bg-black text-white" onClick={onSettingsClick}>
          <Settings size={20} />
        </Button>
      </div>
    </div>
  );
};

export default TrackHeader; 