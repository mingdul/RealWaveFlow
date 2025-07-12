import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  type,
  message,
  onClose,
  duration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-[#D9D9D9]" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-[#BFBFBF]" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-[#BFBFBF]" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-[#D9D9D9]" />;
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case 'success':
        return 'text-[#D9D9D9]';
      case 'error':
        return 'text-[#BFBFBF]';
      case 'warning':
        return 'text-[#BFBFBF]';
      case 'info':
      default:
        return 'text-[#D9D9D9]';
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-[#595959]/80';
      case 'error':
        return 'bg-[#262626]/80';
      case 'warning':
        return 'bg-[#595959]/80';
      case 'info':
      default:
        return 'bg-[#262626]/80';
    }
  };

  return (
    <div
      className={`
        fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border border-[#595959] shadow-lg shadow-[#D9D9D9]/20
        transition-all duration-300 ease-in-out max-w-md backdrop-blur-sm
        ${getBgColor()} text-[#D9D9D9]
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
      `}
    >
      {getIcon()}
      <span className="flex-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
        {message}
      </span>

      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className={`ml-2 hover:opacity-80 transition-opacity ${getAccentColor()}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;
