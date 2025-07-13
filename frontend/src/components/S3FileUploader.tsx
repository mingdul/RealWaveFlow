import React, { useState, useRef, useCallback } from 'react';
import { useS3Upload } from '../hooks/useS3Upload';
import { S3UploadProgress } from './S3UploadProgress';
import { CompleteUploadResponse } from '../types/api';
import { useToast } from '../contexts/ToastContext';

interface S3FileUploaderProps {
  projectId: string;
  accept?: string;
  maxFileSize?: number;
  onUploadComplete?: (result: CompleteUploadResponse) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
  showChunkDetails?: boolean;
}

export const S3FileUploader: React.FC<S3FileUploaderProps> = ({
  projectId,
  accept = '.mp3,.wav,.aiff,.flac,.m4a',
  maxFileSize = 500 * 1024 * 1024,
  onUploadComplete,
  onUploadError,
  className = '',
  showChunkDetails = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showError } = useToast();

  const handleUploadSuccess = async (result: CompleteUploadResponse) => {
    // UploadPage.tsx에서 직접 createStemFile을 호출하므로 여기서는 제거
    if (onUploadComplete) {
      onUploadComplete(result);
    }
  };

  const {
    isUploading,
    uploadProgress,
    error,
    result,
    uploadFile,
    cancelUpload,
    resetState,
    formatFileSize,
    formatUploadSpeed,
  } = useS3Upload({
    onSuccess: handleUploadSuccess,
    onError: onUploadError,
  });

  // 파일 유효성 검사
  const validateFile = useCallback((file: File): string | null => {
    // 파일 크기 검사
    if (file.size > maxFileSize) {
      return `파일 크기가 너무 큽니다. 최대 ${formatFileSize(maxFileSize)}까지 업로드 가능합니다.`;
    }

    // 파일 타입 검사
    if (accept) {
      const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        return `지원하지 않는 파일 형식입니다. 허용된 형식: ${accept}`;
      }
    }

    return null;
  }, [accept, maxFileSize, formatFileSize]);

  // 파일 처리
  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      await uploadFile(file, projectId);
    } catch (error) {
      console.error('업로드 실패:', error);
    }
  }, [validateFile, uploadFile, projectId, showError]);

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]); // 첫 번째 파일만 처리
    }
  }, [handleFile]);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  // 파일 선택 버튼 클릭
  const handleSelectButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 업로드 취소
  const handleCancel = useCallback(async () => {
    try {
      await cancelUpload();
    } catch (error) {
      console.error('업로드 취소 실패:', error);
    }
  }, [cancelUpload]);

  // 새 업로드 시작
  const handleNewUpload = useCallback(() => {
    resetState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetState]);

  // 업로드가 진행 중이거나 완료된 경우 진행률 표시
  if (uploadProgress) {
    return (
      <div className={`${className}`}>
        <S3UploadProgress
          progress={uploadProgress}
          formatFileSize={formatFileSize}
          formatUploadSpeed={formatUploadSpeed}
          onCancel={isUploading ? handleCancel : undefined}
          showChunkDetails={showChunkDetails}
        />
        
        {/* 완료 후 새 업로드 버튼 */}
        {(uploadProgress.status === 'completed' || uploadProgress.status === 'error') && (
          <div className="mt-4 text-center">
            <button
              onClick={handleNewUpload}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            >
              새 파일 업로드
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
        onClick={handleSelectButtonClick}
      >
        {/* 업로드 아이콘 */}
        <div className="mx-auto w-12 h-12 mb-4">
          <svg
            className="w-full h-full text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {/* 메시지 */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">
            {isDragOver ? '파일을 여기에 놓으세요' : '파일을 선택하거나 여기로 드래그하세요'}
          </p>
          <p className="text-sm text-gray-500">
            지원 형식: {accept.replace(/\./g, '').toUpperCase()}
          </p>
          <p className="text-sm text-gray-500">
            최대 파일 크기: {formatFileSize(maxFileSize)}
          </p>
        </div>

        {/* 선택 버튼 */}
        <button
          type="button"
          className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          disabled={isUploading}
        >
          파일 선택
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">
            <strong>업로드 실패:</strong> {error}
          </div>
        </div>
      )}

      {/* 성공 메시지 */}
      {result && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-sm text-green-600">
            <strong>업로드 완료!</strong>
            <div className="mt-1 text-xs text-green-500 font-mono">
              {result.location}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default S3FileUploader; 