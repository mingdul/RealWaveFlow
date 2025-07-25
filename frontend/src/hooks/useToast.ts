import { useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export const useToast = () => {
  const showToast = useCallback((type: ToastType, message: string) => {
    console.log(`[Toast] ${type}: ${message}`);
  }, []);

  return { showToast };
}; 