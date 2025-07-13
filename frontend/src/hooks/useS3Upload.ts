import { useState, useCallback, useRef } from 'react';
import s3UploadService from '../services/s3UploadService';
import { UploadProgress, CompleteUploadResponse } from '../types/api';

export interface UseS3UploadOptions {
  onSuccess?: (result: CompleteUploadResponse) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UseS3UploadReturn {
  // 상태
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  error: string | null;
  result: CompleteUploadResponse | null;
  
  // 메서드
  uploadFile: (file: File, projectId: string) => Promise<void>;
  cancelUpload: () => Promise<void>;
  resetState: () => void;
  
  // 유틸리티
  formatFileSize: (bytes: number) => string;
  formatUploadSpeed: (bytesPerSecond: number) => string;
}

export const useS3Upload = (options: UseS3UploadOptions = {}): UseS3UploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteUploadResponse | null>(null);
  
  // 업로드 시작 시간과 속도 계산을 위한 ref
  const startTimeRef = useRef<number>(0);
  const lastProgressRef = useRef<{ time: number; bytes: number }>({ time: 0, bytes: 0 });

  /**
   * 상태 초기화
   */
  const resetState = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(null);
    setError(null);
    setResult(null);
    startTimeRef.current = 0;
    lastProgressRef.current = { time: 0, bytes: 0 };
  }, []);

  /**
   * 파일 크기 포맷팅
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * 업로드 속도 포맷팅
   */
  const formatUploadSpeed = useCallback((bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s';
  }, [formatFileSize]);

  /**
   * 진행률 콜백
   */
  const handleProgress = useCallback((progress: UploadProgress) => {
    const now = Date.now();
    
    if (startTimeRef.current === 0) {
      startTimeRef.current = now;
      lastProgressRef.current = { time: now, bytes: progress.uploadedBytes };
    }

    // 업로드 속도 계산 (1초마다)
    if (now - lastProgressRef.current.time >= 1000) {
      const timeDiff = (now - lastProgressRef.current.time) / 1000;
      const bytesDiff = progress.uploadedBytes - lastProgressRef.current.bytes;
      const speed = bytesDiff / timeDiff;
      
      // 진행률 객체에 속도 정보 추가
      const enhancedProgress: UploadProgress = {
        ...progress,
        uploadSpeed: speed,
        estimatedTimeRemaining: speed > 0 ? Math.ceil((progress.totalSize - progress.uploadedBytes) / speed) : 0,
      };
      
      setUploadProgress(enhancedProgress);
      lastProgressRef.current = { time: now, bytes: progress.uploadedBytes };
    } else {
      // 초기 진행률에도 기본값 설정
      const initialProgress: UploadProgress = {
        ...progress,
        uploadSpeed: 0,
        estimatedTimeRemaining: 0,
      };
      setUploadProgress(initialProgress);
    }
    
    options.onProgress?.(progress);
  }, [options]);

  /**
   * 기존 프로젝트에 파일 업로드
   */
  const uploadFile = useCallback(async (file: File, projectId: string) => {
    if (isUploading) {
      throw new Error('이미 업로드가 진행 중입니다.');
    }

    resetState();
    setIsUploading(true);
    setError(null);

    try {
      const uploadResult = await s3UploadService.uploadFile(
        file,
        projectId,
        handleProgress
      );

      setResult(uploadResult);
      setIsUploading(false);
      options.onSuccess?.(uploadResult);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('업로드에 실패했습니다.');
      setError(error.message);
      setIsUploading(false);
      options.onError?.(error);
      throw error;
    }
  }, [isUploading, resetState, handleProgress, options]);



  /**
   * 업로드 취소
   */
  const cancelUpload = useCallback(async () => {
    if (!uploadProgress?.uploadId) {
      throw new Error('취소할 업로드가 없습니다.');
    }

    try {
      await s3UploadService.cancelUpload(uploadProgress.uploadId);
      setIsUploading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('업로드 취소에 실패했습니다.');
      setError(error.message);
      throw error;
    }
  }, [uploadProgress?.uploadId]);

  return {
    // 상태
    isUploading,
    uploadProgress,
    error,
    result,
    
    // 메서드
    uploadFile,
    cancelUpload,
    resetState,
    
    // 유틸리티
    formatFileSize,
    formatUploadSpeed,
  };
};

export default useS3Upload; 