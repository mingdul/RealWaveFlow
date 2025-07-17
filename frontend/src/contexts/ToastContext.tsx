import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Toast, { ToastType } from '../components/Toast';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastItem = {
      id,
      type,
      message,
      duration,
    };

    setToasts(prev => {
      // 최대 4개까지만 표시하고, 새로운 토스트가 추가되면 가장 오래된 것 제거
      const updatedToasts = [...prev, newToast];
      if (updatedToasts.length > 4) {
        return updatedToasts.slice(-4);
      }
      return updatedToasts;
    });
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast('warning', message, duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration);
  }, [showToast]);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* 토스트 컨테이너 */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {/* 데스크톱: 우상단, 모바일: 상단 중앙 */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col gap-3 md:gap-4 max-w-full md:max-w-md">
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              className="pointer-events-auto"
              style={{
                transform: `translateY(${index * 8}px) scale(${1 - index * 0.02})`,
                zIndex: 1000 - index,
                opacity: 1 - index * 0.1,
              }}
            >
              <Toast
                type={toast.type}
                message={toast.message}
                onClose={() => removeToast(toast.id)}
                duration={toast.duration}
              />
            </div>
          ))}
        </div>

        {/* 모바일에서 너무 많은 토스트가 있을 때 스크롤 가능한 컨테이너 */}
        <div className="md:hidden absolute top-4 left-4 right-4">
          {toasts.length > 3 && (
            <div className="mb-2 text-center">
              <button
                onClick={clearAllToasts}
                className="pointer-events-auto text-xs text-[var(--color-light)] 
                          hover:text-[var(--color-lightest)] bg-[var(--color-dark)]/80 
                          px-3 py-1 rounded-full backdrop-blur-sm border border-[var(--color-medium)]/30
                          transition-all duration-200"
              >
                Clear all ({toasts.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 키보드 단축키 리스너 (Escape로 모든 토스트 닫기) */}
      <div
        className="fixed inset-0 pointer-events-none"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && toasts.length > 0) {
            clearAllToasts();
          }
        }}
        tabIndex={-1}
      />
    </ToastContext.Provider>
  );
};

// Custom Hook
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext; 