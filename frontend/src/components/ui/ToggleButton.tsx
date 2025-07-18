import React from 'react';

interface ToggleButtonProps {
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
  isOn: boolean;
  onToggle: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  iconOn,
  iconOff,
  isOn,
  onToggle,
  label,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      className={`toggle-btn flex items-center gap-2 rounded px-3 py-2 transition-all duration-200 ${
        isOn 
          ? 'bg-blue-600 text-white transform scale-110' 
          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'} ${className}`}
      onClick={onToggle}
      disabled={disabled}
      title={label ? (isOn ? `${label} 켜짐` : `${label} 꺼짐`) : (isOn ? '켜짐' : '꺼짐')}
    >
      {isOn ? iconOn : iconOff}
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
};

export default ToggleButton;