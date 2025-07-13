import React from 'react';
import { UploadProgress, ChunkProgress } from '../types/api';

interface S3UploadProgressProps {
  progress: UploadProgress;
  formatFileSize: (bytes: number) => string;
  formatUploadSpeed: (bytesPerSecond: number) => string;
  onCancel?: () => void;
  showChunkDetails?: boolean;
}

export const S3UploadProgress: React.FC<S3UploadProgressProps> = ({
  progress,
  formatFileSize,
  formatUploadSpeed,
  onCancel,
  showChunkDetails = false,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing':
        return 'bg-blue-500';
      case 'uploading':
        return 'bg-green-500';
      case 'completing':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'preparing':
        return '준비 중...';
      case 'uploading':
        return '업로드 중...';
      case 'completing':
        return '완료 처리 중...';
      case 'completed':
        return '업로드 완료';
      case 'error':
        return '업로드 실패';
      case 'cancelled':
        return '업로드 취소됨';
      default:
        return '알 수 없는 상태';
    }
  };

  const getChunkStatusColor = (status: ChunkProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-200';
      case 'uploading':
        return 'bg-blue-400';
      case 'completed':
        return 'bg-green-400';
      case 'error':
        return 'bg-red-400';
      default:
        return 'bg-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds <= 0) return '계산 중...';
    if (seconds < 60) return `${Math.round(seconds)}초`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return remainingSeconds > 0 ? `${minutes}분 ${remainingSeconds}초` : `${minutes}분`;
    }
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.round((seconds % 3600) / 60);
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
  };

  // 업로드 속도와 예상 시간
  const uploadSpeed = progress.uploadSpeed || 0;
  const estimatedTimeRemaining = progress.estimatedTimeRemaining || 0;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-lg font-semibold text-gray-800 truncate">
            {progress.fileName}
          </div>
          <div className="text-sm text-gray-500">
            {formatFileSize(progress.totalSize)}
          </div>
        </div>
        
        {progress.status === 'uploading' && onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
          >
            취소
          </button>
        )}
      </div>

      {/* 상태 표시 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>{getStatusText(progress.status)}</span>
          <span>{isNaN(progress.progress) ? '0.0' : Math.min(100, Math.max(0, progress.progress)).toFixed(1)}%</span>
        </div>
        
        {/* 진행률 바 */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getStatusColor(
              progress.status
            )}`}
            style={{ width: `${isNaN(progress.progress) ? 0 : Math.min(100, Math.max(0, progress.progress))}%` }}
          />
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-500">업로드됨:</span>
          <span className="ml-2 font-mono">
            {formatFileSize(progress.uploadedBytes)} / {formatFileSize(progress.totalSize)}
          </span>
        </div>
        
        {uploadSpeed > 0 && progress.status === 'uploading' && (
          <div>
            <span className="text-gray-500">속도:</span>
            <span className="ml-2 font-mono">{formatUploadSpeed(uploadSpeed)}</span>
          </div>
        )}
        
        {estimatedTimeRemaining > 0 && progress.status === 'uploading' && (
          <div>
            <span className="text-gray-500">예상 시간:</span>
            <span className="ml-2 font-mono">{formatTime(estimatedTimeRemaining)}</span>
          </div>
        )}
        
        <div>
          <span className="text-gray-500">청크 수:</span>
          <span className="ml-2 font-mono">{progress.chunks.length}</span>
        </div>
      </div>

      {/* 에러 메시지 */}
      {progress.status === 'error' && progress.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">
            <strong>에러:</strong> {progress.error}
          </div>
        </div>
      )}

      {/* 완료 정보 */}
      {progress.status === 'completed' && progress.result && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-sm text-green-600">
            <strong>업로드 완료!</strong>
            <div className="mt-1 text-xs text-green-500 font-mono">
              Location: {progress.result.location}
            </div>
          </div>
        </div>
      )}

      {/* 청크 상세 정보 (토글 가능) */}
      {showChunkDetails && progress.chunks.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            청크 업로드 상태:
          </div>
          
          <div className="grid grid-cols-8 gap-1">
            {progress.chunks.map((chunk) => (
              <div
                key={chunk.partNumber}
                className={`h-4 rounded-sm transition-all duration-200 ${getChunkStatusColor(
                  chunk.status
                )} relative group`}
                title={`Part ${chunk.partNumber}: ${chunk.progress}% (${formatFileSize(
                  chunk.size
                )})`}
              >
                {/* 청크 내부 진행률 */}
                {chunk.status === 'uploading' && (
                  <div
                    className="h-full bg-blue-600 rounded-sm transition-all duration-200"
                    style={{ width: `${isNaN(chunk.progress) ? 0 : Math.min(100, Math.max(0, chunk.progress))}%` }}
                  />
                )}
                
                {/* 툴팁 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                  Part {chunk.partNumber}<br />
                  {isNaN(chunk.progress) ? '0.0' : Math.min(100, Math.max(0, chunk.progress)).toFixed(1)}% ({formatFileSize(chunk.size)})
                  {chunk.error && (
                    <>
                      <br />에러: {chunk.error}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* 청크 상태 범례 */}
          <div className="flex items-center justify-center space-x-4 mt-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-200 rounded-sm" />
              <span>대기</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-400 rounded-sm" />
              <span>업로드 중</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-400 rounded-sm" />
              <span>완료</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-400 rounded-sm" />
              <span>에러</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default S3UploadProgress; 