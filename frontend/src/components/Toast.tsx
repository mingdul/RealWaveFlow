import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

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
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 마운트 시 애니메이션
    const mountTimer = setTimeout(() => setIsVisible(true), 50);
    
    // 자동 종료 타이머
    const exitTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(exitTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 200);
    }, 150);
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          iconColor: 'text-green-400',
          borderColor: 'border-green-400/30',
          bgGradient: 'bg-gradient-to-r from-green-500/10 to-green-400/5',
          shadowColor: 'shadow-green-400/20',
          progressColor: 'bg-green-400'
        };
      case 'error':
        return {
          icon: <XCircle className="h-5 w-5" />,
          iconColor: 'text-red-400',
          borderColor: 'border-red-400/30',
          bgGradient: 'bg-gradient-to-r from-red-500/10 to-red-400/5',
          shadowColor: 'shadow-red-400/20',
          progressColor: 'bg-red-400'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          iconColor: 'text-yellow-400',
          borderColor: 'border-yellow-400/30',
          bgGradient: 'bg-gradient-to-r from-yellow-500/10 to-yellow-400/5',
          shadowColor: 'shadow-yellow-400/20',
          progressColor: 'bg-yellow-400'
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-5 w-5" />,
          iconColor: 'text-blue-400',
          borderColor: 'border-blue-400/30',
          bgGradient: 'bg-gradient-to-r from-blue-500/10 to-blue-400/5',
          shadowColor: 'shadow-blue-400/20',
          progressColor: 'bg-blue-400'
        };
    }
  };

  const config = getToastConfig();

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-start gap-3 p-4 min-w-[320px] max-w-md
        bg-[#262626] backdrop-blur-xl border ${config.borderColor}
        rounded-xl shadow-lg ${config.shadowColor}
        transition-all duration-300 ease-out
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
      style={{
        background: `linear-gradient(135deg, 
          rgb(38, 38, 38) 0%, 
          rgb(45, 45, 45) 50%, 
          rgb(38, 38, 38) 100%
        )`
      }}
    >
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 ${config.bgGradient} opacity-50`} />
      
      {/* Progress bar */}
      <div 
        className={`absolute bottom-0 left-0 h-0.5 ${config.progressColor} transition-all duration-300 ease-linear`}
        style={{
          width: isVisible && !isExiting ? '100%' : '0%',
          transitionDuration: `${duration}ms`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex items-start gap-3 w-full">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconColor} mt-0.5`}>
          {config.icon}
        </div>
        
        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--color-lightest)] leading-relaxed break-words">
            {message}
          </p>
        </div>
        
        {/* Close button */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 text-[var(--color-light)] hover:text-[var(--color-lightest)] 
                     hover:bg-white/10 rounded-md transition-all duration-200 group"
          aria-label="Close notification"
        >
          <X className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
        </button>
      </div>
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
      </div>
    </div>
  );
};

export default Toast;
