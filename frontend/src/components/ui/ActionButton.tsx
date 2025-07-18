import React from 'react';

interface ActionButtonProps {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  title?: string;
  className?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  title,
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  return (
    <button
      className={`action-btn flex items-center gap-2 rounded px-4 py-2 font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getVariantStyles()} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title || label}
    >
      {icon && <span className="icon">{icon}</span>}
      <span className="label">{label}</span>
    </button>
  );
};

export default ActionButton;