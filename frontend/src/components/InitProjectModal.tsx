import React, { useReducer, useState, useEffect } from 'react';
import {
  Check,
  X,
  FileAudio,
  Upload,
  Plus,
  Music,
  Drum,
  Mic,
  Zap,
  Guitar,
  Volume2,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { UploadProgress, User } from '../types/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import s3UploadService from '../services/s3UploadService';
import stemJobService from '../services/stemJobService';
import StepProgress from './StepProgress';
import trackService from '../services/trackService';
import { useSocket } from '../contexts/SocketContext';
import socketService from '../services/socketService';
import AnimatedModal from './AnimatedModal';
// import { encodeFilename, getDisplayFilename } from '../utils/filenameUtils';

// Types
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  tag: string;
  key: string;
  bpm?: string;
  uploadProgress: number;
  isComplete: boolean;
  matchedFileId?: string;
  s3Url?: string;
  file?: File;
  isSelected: boolean;
}

interface CommitState {
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  currentUploadIndex: number;
}

interface InitProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectDescription: string;
  stageId?: string;
  onComplete: () => void;
}

const tagOptions = [
  { value: 'BASS', label: 'Bass', icon: Volume2, color: 'bg-red-500' },
  { value: 'DRUM', label: 'Drums', icon: Drum, color: 'bg-orange-500' },
  { value: 'VOCAL', label: 'Vocal', icon: Mic, color: 'bg-blue-500' },
  { value: 'SYNTH', label: 'Synth', icon: Zap, color: 'bg-purple-500' },
  { value: 'GUITAR', label: 'Guitar', icon: Guitar, color: 'bg-green-500' },
  { value: 'LEAD', label: 'Lead', icon: Music, color: 'bg-yellow-500' },
  { value: 'HARMONY', label: 'Harmony', icon: Users, color: 'bg-pink-500' },
  {
    value: 'OTHER',
    label: 'Other',
    icon: MoreHorizontal,
    color: 'bg-gray-500',
  },
];
const keyOptions = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
  'Aminor',
  'Cmajor',
];

const commitReducer = (state: CommitState, action: any): CommitState => {
  switch (action.type) {
    case 'ADD_FILE':
      return {
        ...state,
        uploadedFiles: [...state.uploadedFiles, action.payload],
      };
    case 'REMOVE_FILE':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.filter(
          (f) => f.id !== action.payload
        ),
      };
    case 'UPDATE_FILE':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.map((f) =>
          f.id === action.payload.id ? { ...f, ...action.payload.updates } : f
        ),
      };
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    case 'SET_CURRENT_UPLOAD_INDEX':
      return { ...state, currentUploadIndex: action.payload };
    case 'RESET_FILES':
      return {
        ...state,
        uploadedFiles: [],
        isUploading: false,
        currentUploadIndex: 0,
      };
    default:
      return state;
  }
};

const FileSelectionAndUploadStep: React.FC<{
  files: UploadedFile[];
  onAddFile: (file: UploadedFile) => void;
  onRemoveFile: (id: string) => void;
  onUpdateFile: (id: string, updates: Partial<UploadedFile>) => void;
  projectId: string;
  projectName: string;
  projectDescription: string;
  user: User | null;
  isUploading: boolean;
  currentUploadIndex: number;
  onStartUpload: () => void;
}> = ({
  files,
  onAddFile,
  onRemoveFile,
  onUpdateFile,
  isUploading,
  currentUploadIndex,
  onStartUpload,
}) => {
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    Array.from(selectedFiles).forEach((file) => {
      if (files.some((f) => f.name === file.name)) return;
      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        tag: '',
        key: '',
        bpm: '',
        uploadProgress: 0,
        isComplete: false,
        isSelected: true,
        file,
      };
      onAddFile(newFile);
    });
    e.target.value = '';
  };

  const selectedFiles = files.filter((f) => f.isSelected && !f.isComplete);
  const completedFiles = files.filter((f) => f.isComplete);
  // Make tag required, but key and bpm optional
  const canStartUpload =
    selectedFiles.length > 0 &&
    selectedFiles.every((f) => f.tag && f.tag.trim() !== '');

  return (
    <div className='max-h-[70vh] overflow-y-auto p-6 pb-[150px] pt-0'>
      <h3 className='mb-2 text-lg font-semibold text-white'>
        Select and Upload Stems
      </h3>
      <p className='mb-6 text-gray-400'>
        Choose stems, set their metadata, and upload them to the project.
      </p>

      {/* File Selection Area or Upload Complete */}
      {completedFiles.length > 0 && selectedFiles.length === 0 && !isUploading ? (
        // Upload Complete Section
        <div className='mb-6 rounded-lg border border-green-500/30 bg-green-900/20 py-8 text-center'>
          <Check size={48} className='mx-auto mb-4 text-green-400' />
          <h3 className='mb-2 text-xl font-semibold text-white'>
            Upload Complete!
          </h3>
          <p className='mb-4 text-gray-300'>
            Successfully uploaded {completedFiles.length} file
            {completedFiles.length > 1 ? 's' : ''}.
          </p>
          <p className='text-sm text-gray-400'>
            You can now complete the project setup or add more stems.
          </p>
        </div>
      ) : (
        // File Selection Area
        <div className='mb-6'>
          <input
            type='file'
            id='modal-file-input'
            multiple
            accept='.wav,.mp3,.aiff,.flac,.m4a,.ogg'
            onChange={handleFileSelection}
            className='hidden'
          />
          <label
            htmlFor='modal-file-input'
            className='block w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-600 p-6 transition-all duration-200 hover:border-purple-500 hover:bg-purple-900/10'
          >
            <div className='text-center'>
              <Plus size={28} className='mx-auto mb-3 text-purple-400' />
              <h3 className='mb-2 text-lg font-semibold text-white'>
                Select Stems
              </h3>
              <p className='text-sm text-gray-400'>
                Choose multiple stems to upload at once
              </p>
              <p className='mt-2 text-xs text-gray-500'>
                Supports: WAV, MP3, AIFF, FLAC, M4A, OGG
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className='mb-6 rounded-lg bg-gray-800 p-4'>
          <h3 className='text-lg font-semibold text-white'>
            Uploading {currentUploadIndex + 1} of {selectedFiles.length}{' '}
            stems...
          </h3>
          <div className='mt-2 h-2 w-full rounded-full bg-gray-600'>
            <div
              className='h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300'
              style={{
                width: `${Math.round((currentUploadIndex / selectedFiles.length) * 100)}%`,
              }}
            />
          </div>
          <p className='mt-1 text-sm text-gray-400'>
            {Math.round((currentUploadIndex / selectedFiles.length) * 100)}%
            Complete
          </p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className='space-y-3'>
          <h3 className='mb-3 text-lg font-semibold text-white'>
            Stems ({files.length})
          </h3>
          {files.map((file) => {
            const idx = selectedFiles.findIndex((sf) => sf.id === file.id);
            const isCurrent = isUploading && idx === currentUploadIndex;
            return (
              <div
                key={file.id}
                className={`rounded-lg border p-4 transition-all ${isCurrent ? 'border-purple-500 bg-purple-900/20 shadow-lg' : 'border-gray-600 bg-gray-800 hover:border-gray-500'}`}
              >
                <div className='flex items-start space-x-3'>
                  <FileAudio
                    className='mt-1 flex-shrink-0 text-gray-400'
                    size={20}
                  />
                  <div className='min-w-0 flex-1'>
                    <div className='mb-3 flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        <span className='truncate text-sm font-medium text-white'>
                          {file.name}
                        </span>
                        <span className='whitespace-nowrap text-xs text-gray-400'>
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        {file.isComplete && (
                          <span className='text-xs font-medium text-green-400'>
                            ✓ Uploaded
                          </span>
                        )}
                      </div>
                      {!file.isComplete && (
                        <button
                          onClick={() => onRemoveFile(file.id)}
                          className='flex-shrink-0 rounded p-1 text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-500'
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <div className='grid grid-cols-1 gap-3 text-sm md:grid-cols-3'>
                      <div>
                        <label className='mb-2 block text-xs text-gray-400'>
                          Instrument
                        </label>
                        <div className='grid grid-cols-8 gap-1'>
                          {tagOptions.map((tag) => {
                            const Icon = tag.icon;
                            return (
                              <button
                                key={tag.value}
                                type='button'
                                onClick={() =>
                                  onUpdateFile(file.id, { tag: tag.value })
                                }
                                disabled={file.isComplete}
                                className={`relative rounded-lg border-2 p-2 transition-all duration-200 ${
                                  file.tag === tag.value
                                    ? `${tag.color} border-white text-white`
                                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                                } ${file.isComplete ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'}`}
                                title={tag.label}
                              >
                                <Icon size={16} />
                                {file.tag === tag.value && (
                                  <div className='absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-white'>
                                    <Check size={8} className='text-gray-800' />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {file.tag && (
                          <p className='mt-1 text-xs text-gray-400'>
                            {
                              tagOptions.find((t) => t.value === file.tag)
                                ?.label
                            }
                          </p>
                        )}
                      </div>
                      <div>
                        <label className='mb-1 block text-xs text-gray-400'>
                          Key <span className='text-gray-500'>(optional)</span>
                        </label>
                        <select
                          value={file.key}
                          onChange={(e) =>
                            onUpdateFile(file.id, { key: e.target.value })
                          }
                          disabled={file.isComplete}
                          className='w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                        >
                          <option value=''>Select key (optional)</option>
                          {keyOptions.map((key) => (
                            <option key={key} value={key}>
                              {key}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className='mb-1 block text-xs text-gray-400'>
                          BPM <span className='text-gray-500'>(optional)</span>
                        </label>
                        <input
                          type='text'
                          value={file.bpm || ''}
                          onChange={(e) =>
                            onUpdateFile(file.id, { bpm: e.target.value })
                          }
                          disabled={file.isComplete}
                          placeholder='e.g. 120 (optional)'
                          className='w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                        />
                      </div>
                    </div>

                    {file.uploadProgress > 0 && file.uploadProgress < 100 && (
                      <div className='mt-2'>
                        <div className='h-2 w-full rounded-full bg-gray-600'>
                          <div
                            className='h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300'
                            style={{ width: `${file.uploadProgress}%` }}
                          />
                        </div>
                        <p className='mt-1 text-xs text-gray-400'>
                          {file.uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Upload Button */}
      {!isUploading && selectedFiles.length > 0 && (
        <div className='mb-6'>
          <button
            onClick={onStartUpload}
            disabled={!canStartUpload}
            className={`flex w-full items-center justify-center rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700 ${!canStartUpload ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <Upload size={20} className='mr-2' />
            Start Upload ({selectedFiles.length} stems)
          </button>
          {!canStartUpload && (
            <p className='mt-2 text-center text-sm text-amber-400'>
              Please set <b>tag</b> for all selected stems before uploading.
              (Key and BPM are optional)
            </p>
          )}
        </div>
              )}
    </div>
  );
};

const InitProjectModal: React.FC<InitProjectModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  projectDescription,
  stageId = '',
  onComplete,
}) => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [state, dispatch] = useReducer(commitReducer, {
    uploadedFiles: [],
    isUploading: false,
    currentUploadIndex: 0,
  });
  const [completedStemCount, setCompletedStemCount] = useState(0);
  const { isConnected } = useSocket();

  const steps = ['Create Track', 'Upload Stems'];

  const handleStartUpload = React.useCallback(async () => {
    console.log('[DEBUG] InitProjectModal - Starting upload process');
    dispatch({ type: 'SET_UPLOADING', payload: true });

    const selectedFiles = state.uploadedFiles.filter(
      (f) => f.isSelected && !f.isComplete
    );
    console.log(
      '[DEBUG] InitProjectModal - Selected files for upload:',
      selectedFiles.map((f) => ({
        name: f.name,
        tag: f.tag,
        key: f.key,
        bpm: f.bpm,
      }))
    );

    // 병렬 업로드 및 바로 stem-job 처리
    const uploadAndProcessPromises = selectedFiles.map(
      (fileToUpload, index) => {
        if (!fileToUpload.file) {
          console.error(
            '[ERROR] InitProjectModal - No file object for:',
            fileToUpload.name
          );
          return Promise.resolve({ error: true, id: fileToUpload.id });
        }

        return s3UploadService
          .uploadFile(
            fileToUpload.file,
            projectId,
            (progress: UploadProgress) => {
              const pct = Math.floor(
                (progress.uploadedBytes / progress.totalSize) * 100
              );
              dispatch({
                type: 'UPDATE_FILE',
                payload: {
                  id: fileToUpload.id,
                  updates: { uploadProgress: pct },
                },
              });
            }
          )
          .then(async (result) => {
            console.log(
              '[DEBUG] InitProjectModal - S3 upload completed for',
              fileToUpload.name,
              ':',
              result
            );
            dispatch({ type: 'SET_CURRENT_UPLOAD_INDEX', payload: index });

            if (!fileToUpload.tag || fileToUpload.tag.trim() === '') {
              throw new Error(
                `Instrument is required for ${fileToUpload.name}`
              );
            }

            const stemJobRequest = {
              file_name: result.fileName, // 이미 인코딩된 파일명이 result에 포함됨
              file_path: result.key,
              key: fileToUpload.key || '',
              bpm: fileToUpload.bpm || '',
              stage_id: stageId,
              track_id: projectId,
              instrument: fileToUpload.tag,
            };

            console.log(
              '[DEBUG] InitProjectModal - Calling stem-job/create for',
              fileToUpload.name,
              ':',
              stemJobRequest
            );
            const stemJobResult =
              await stemJobService.createStemJob(stemJobRequest);
            console.log(
              '[DEBUG] InitProjectModal - stem-job/create completed for',
              fileToUpload.name,
              ':',
              stemJobResult
            );

            dispatch({
              type: 'UPDATE_FILE',
              payload: {
                id: fileToUpload.id,
                updates: {
                  uploadProgress: 100,
                  isComplete: true,
                  isSelected: false,
                  s3Url: result.location,
                },
              },
            });

            return { error: false };
          })
          .catch((err) => {
            console.error(
              '[ERROR] InitProjectModal - Upload or stem-job/create failed for',
              fileToUpload.name,
              ':',
              err
            );
            showError(
              `Failed to process ${fileToUpload.name}. Please try again.`
            );
            return { error: true };
          });
      }
    );

    // 병렬 작업 전체 완료 대기
    await Promise.all(uploadAndProcessPromises);

    dispatch({ type: 'SET_UPLOADING', payload: false });
    dispatch({ type: 'SET_CURRENT_UPLOAD_INDEX', payload: 0 });

    console.log(
      '[DEBUG] InitProjectModal - Upload & stem-job process completed'
    );
    showSuccess('All Stems uploaded and processed!');
  }, [state.uploadedFiles, projectId, stageId, showError, showSuccess]);

  const handleComplete = async () => {
    console.log('[DEBUG] InitProjectModal - Complete button clicked');
    console.log(
      '[DEBUG] InitProjectModal - Completed files:',
      completedFiles.length
    );
    console.log('[DEBUG] InitProjectModal - Stage ID:', stageId);

    if (completedFiles.length === 0) {
      console.log(
        '[DEBUG] InitProjectModal - No completed files, showing error'
      );
      showError('업로드된 파일이 없습니다. 파일을 업로드한 후 완료해주세요.');
      return;
    }

    try {
      const mixingInitRequest = {
        stageId: stageId,
      };

      console.log(
        '[DEBUG] InitProjectModal - Calling stem-job/request-mixing-init with:',
        mixingInitRequest
      );
      const mixingInitResult =
        await stemJobService.requestMixingInit(mixingInitRequest);
      console.log(
        '[DEBUG] InitProjectModal - stem-job/request-mixing-init completed:',
        mixingInitResult
      );
      await trackService.updateTrackStatus(projectId, 'producing');
      showSuccess('프로젝트 초기화 완료!');
      
      // Complete 완료 후 모달 상태 초기화
      setCompletedStemCount(0);
      dispatch({ type: 'RESET_FILES' });
      
      onComplete();
    } catch (error: any) {
      console.error('[ERROR] InitProjectModal - Mixing init failed:', error);
      showError(error.message || '믹싱 초기화에 실패했습니다.');
    }
  };

  const completedFiles = state.uploadedFiles.filter((f) => f.isComplete);
  const uploadedFileCount = state.uploadedFiles.filter(
    (f) => f.isComplete
  ).length;
  // 업로드한 모든 파일의 처리가 완료되었을 때만 Complete 버튼 활성화
  const canComplete =
    completedStemCount >= uploadedFileCount &&
    uploadedFileCount > 0 &&
    !state.isUploading;

  // 소켓 이벤트 처리
  useEffect(() => {
    if (!isConnected || !isOpen) return;

    // 개별 스템 처리 완료 이벤트 리스너
    const handleFileProcessingCompleted = (data: {
      trackId: string;
      fileName: string;
      result: any;
      processingTime: number;
    }) => {
      console.log('File processing completed event received:', data);

      if (data.trackId === projectId) {
        setCompletedStemCount((prev: number) => prev + 1);
        console.log(
          `Stem processing completed: ${data.fileName}, count: ${completedStemCount + 1}`
        );
      }
    };

    // 소켓 이벤트 리스너 등록
    socketService.on(
      'file-processing-completed',
      handleFileProcessingCompleted
    );

    // 에러 핸들링
    const handleSocketError = (error: any) => {
      console.error('Socket error:', error);
    };

    const handleSocketConnect = () => {
      console.log('Socket connected');
    };

    const handleSocketDisconnect = (reason: string) => {
      console.log('Socket disconnected:', reason);
    };

    socketService.on('error', handleSocketError);
    socketService.on('connect', handleSocketConnect);
    socketService.on('disconnect', handleSocketDisconnect);

    // Cleanup 함수
    return () => {
      socketService.off(
        'file-processing-completed',
        handleFileProcessingCompleted
      );
      socketService.off('error', handleSocketError);
      socketService.off('connect', handleSocketConnect);
      socketService.off('disconnect', handleSocketDisconnect);
    };
  }, [isConnected, isOpen, projectId, stageId]);

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setCompletedStemCount(0);
      // 모달 상태 완전 초기화
      dispatch({ type: 'SET_UPLOADING', payload: false });
      dispatch({ type: 'SET_CURRENT_UPLOAD_INDEX', payload: 0 });
      // 업로드된 파일 리스트 초기화
      dispatch({ type: 'RESET_FILES' });
    }
  }, [isOpen]);

  const handleCloseModal = () => {
    if (state.isUploading) {
      showError('업로드 중에는 모달을 닫을 수 없습니다.');
      return;
    }

    if (state.uploadedFiles.length > 0 && completedFiles.length === 0) {
      const confirmClose = window.confirm(
        '업로드되지 않은 파일이 있습니다. 정말로 닫으시겠습니까?'
      );
      if (!confirmClose) return;
    }

    onClose();
  };

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={false}
      animationType="scale"
      className='flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl bg-gray-800 shadow-2xl mx-8'
    >
        <div className='flex h-full flex-col overflow-y-auto'>
          {/* Header */}
          <div className='flex items-center justify-between border-b border-gray-700 p-6'>
            <div>
              <h2 className='text-2xl font-bold text-white'>
                Upload Stems
              </h2>
              <p className='mt-1 text-sm text-gray-400'>{projectName}</p>
            </div>
            <button
              onClick={handleCloseModal}
              className='rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white'
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className='flex-1 overflow-hidden'>
            <div className='p-6 pb-0'>
              <StepProgress currentStep={2} steps={steps} />
            </div>
            <FileSelectionAndUploadStep
              files={state.uploadedFiles}
              onAddFile={(file) =>
                dispatch({ type: 'ADD_FILE', payload: file })
              }
              onRemoveFile={(id) =>
                dispatch({ type: 'REMOVE_FILE', payload: id })
              }
              onUpdateFile={(id, updates) =>
                dispatch({ type: 'UPDATE_FILE', payload: { id, updates } })
              }
              projectId={projectId}
              projectName={projectName}
              projectDescription={projectDescription}
              user={user}
              isUploading={state.isUploading}
              currentUploadIndex={state.currentUploadIndex}
              onStartUpload={handleStartUpload}
            />
          </div>

          {/* Footer */}
          <div className='flex items-center justify-between rounded-b-xl border-t border-gray-700 bg-gray-900/50 p-4'>
            <button
              onClick={handleCloseModal}
              disabled={state.isUploading}
              className={`rounded-lg bg-gray-600 px-6 py-2 font-medium text-white transition-colors hover:bg-gray-700 ${state.isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={!canComplete}
              className={`rounded-lg bg-purple-600 px-6 py-2 font-medium text-white transition-colors hover:bg-purple-700 ${!canComplete ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              Complete
            </button>
          </div>
        </div>
    </AnimatedModal>
  );
};

export default InitProjectModal;
