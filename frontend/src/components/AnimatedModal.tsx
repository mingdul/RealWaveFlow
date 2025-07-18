import React, { useState, useEffect } from 'react';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
  animationType?: 'scale' | 'slideUp' | 'slideDown' | 'fade';
}

const AnimatedModal: React.FC<AnimatedModalProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  closeOnBackdropClick = true,
  animationType = 'scale'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsExiting(false);
      // 애니메이션 시작을 위한 작은 지연
      setTimeout(() => {
        setIsExiting(false);
      }, 10);
    } else {
      handleExit();
    }
  }, [isOpen]);

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 300); // 애니메이션 지속 시간과 일치
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  if (!isVisible) return null;

  const getAnimationClasses = () => {
    const baseTransition = 'transition-all duration-300 ease-out';
    
    switch (animationType) {
      case 'slideUp':
        return {
          backdrop: `${baseTransition} ${isExiting ? 'opacity-0' : 'opacity-100'}`,
          content: `${baseTransition} ${isExiting ? 'opacity-0 translate-y-8 scale-95' : 'opacity-100 translate-y-0 scale-100'}`
        };
      case 'slideDown':
        return {
          backdrop: `${baseTransition} ${isExiting ? 'opacity-0' : 'opacity-100'}`,
          content: `${baseTransition} ${isExiting ? 'opacity-0 -translate-y-8 scale-95' : 'opacity-100 translate-y-0 scale-100'}`
        };
      case 'fade':
        return {
          backdrop: `${baseTransition} ${isExiting ? 'opacity-0' : 'opacity-100'}`,
          content: `${baseTransition} ${isExiting ? 'opacity-0' : 'opacity-100'}`
        };
      case 'scale':
      default:
        return {
          backdrop: `${baseTransition} ${isExiting ? 'opacity-0' : 'opacity-100'}`,
          content: `${baseTransition} ${isExiting ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`
        };
    }
  };

  const animationClasses = getAnimationClasses();

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${animationClasses.backdrop}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`${animationClasses.content} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default AnimatedModal; 