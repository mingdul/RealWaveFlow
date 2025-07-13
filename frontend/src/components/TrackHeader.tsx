import React from 'react';
import { ChevronLeft, Bell, Settings } from 'lucide-react';
import { Button } from './';

interface TrackHeaderProps {
  onBack?: () => void;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
}

const TrackHeader: React.FC<TrackHeaderProps> = ({
  onBack,
  onNotificationClick,
  onSettingsClick
}) => {
  return (
    <div className="bg-black px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="p-2" onClick={onBack}>
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold text-white">WAVEFLOW</h1>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="p-2" onClick={onNotificationClick}>
          <Bell size={20} />
        </Button>
        <Button variant="ghost" size="sm" className="p-2" onClick={onSettingsClick}>
          <Settings size={20} />
        </Button>
      </div>
    </div>
  );
};

export default TrackHeader; 