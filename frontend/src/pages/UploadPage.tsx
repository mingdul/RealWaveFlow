import React, { useReducer } from 'react';
// import { useEffect } from 'react';
import { Check, X, FileAudio, Loader2, Upload, Plus, Clock, AlertCircle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './UploadPage.css';
import Logo from '../components/Logo';
import { UploadProgress } from '../types/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSocket, FileDuplicateEvent, ProcessingApprovedEvent, FileProcessingHandlers } from '../contexts/SocketContext';
import s3UploadService from '../services/s3UploadService';
import stemFileService from '../services/stemFileService';
import categoryService from '../services/categoryService';
import sessionBestService from '../services/sessionBestService';

// Types
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  tag: string;
  key: string;
  description: string;
  uploadProgress: number;
  isComplete: boolean;
  matchedFileId?: string;
  s3Url?: string;
  file?: File;
  isSelected: boolean;
  
  // 새로운 워크플로우 상태들
  processingStatus: 'pending' | 'uploading' | 'waiting_hash' | 'duplicate' | 'approved' | 'processing' | 'completed' | 'error';
  stemHash?: string;
  errorMessage?: string;
  duplicateInfo?: {
    duplicateHash: string;
    originalFilePath: string;
  };
}

interface MasterFile {
  id: string;
  name: string;
}

interface CommitState {
  uploadedFiles: UploadedFile[];
  currentStep: number;
}

const tagOptions = ['BASS', 'DRUM', 'VOCAL', 'SYNTH', 'GUITAR', 'LEAD', 'HARMONY', 'OTHER'];
const keyOptions = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Aminor', 'Cmajor'];

// 상태 관리를 위한 리듀서 함수
const commitReducer = (state: CommitState, action: any): CommitState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'ADD_FILE':
      return { ...state, uploadedFiles: [...state.uploadedFiles, action.payload] };
    case 'REMOVE_FILE':
      return { ...state, uploadedFiles: state.uploadedFiles.filter(f => f.id !== action.payload) };
    case 'UPDATE_FILE':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.map(f =>
          f.id === action.payload.id ? { ...f, ...action.payload.updates } : f
        )
      };
    default:
      return state;
  }
};

// Step Progress Sidebar Component
const StepSidebar: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    {
      number: 1,
      title: 'Select & Configure Files',
      description: 'Choose files and set metadata & matching'
    },
    {
      number: 2,
      title: 'Upload Files',
      description: 'Upload files and wait for processing approval'
    },
    {
      number: 3,
      title: 'Check Upload Result',
      description: 'Review and finalize your upload result'
    }
  ];

  return (
    <div className="step-sidebar">
      <div className="brand-section">
        <Logo />
      </div>

      <h2 className="commit-title">Upload</h2>

      <div className="steps-container">
        {steps.map((step) => (
          <div key={step.number} className="step-item">
            <div className={`step-number ${currentStep > step.number
                ? 'step-number-completed'
                : currentStep === step.number
                  ? 'step-number-current'
                  : 'step-number-inactive'
              }`}>
              {currentStep > step.number ? (
                <Check size={16} className="text-white" />
              ) : (
                <span className="text-white text-sm font-medium">{step.number}</span>
              )}
            </div>
            <div className="step-content">
              <h3 className={`step-title ${currentStep >= step.number ? 'step-title-active' : 'step-title-inactive'
                }`}>
                {step.title}
              </h3>
              <p className={`step-description ${currentStep >= step.number ? 'step-description-active' : 'step-description-inactive'
                }`}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// File Selection Step Component
const FileSelectionStep: React.FC<{
  files: UploadedFile[];
  masterFiles: MasterFile[];
  onAddFile: (file: UploadedFile) => void;
  onRemoveFile: (id: string) => void;
  onUpdateFile: (id: string, updates: Partial<UploadedFile>) => void;
}> = ({ files,onAddFile, onRemoveFile, onUpdateFile }) => {

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    Array.from(selectedFiles).forEach((file) => {
      if (files.some(f => f.name === file.name)) {
        console.warn(`Duplicate file skipped: ${file.name}`);
        return;
      }

      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        tag: '',
        key: '',
        description: '',
        uploadProgress: 0,
        isComplete: false,
        isSelected: true,
        file: file,
        processingStatus: 'pending'
      };

      onAddFile(newFile);
    });

    e.target.value = '';
  };

  return (
    <div className="upload-container">
      <h2 className="upload-title">Select Files to Upload</h2>
      <p className="text-gray-300 mb-6">Choose the audio files you want to add to this commit.</p>

      {/* 파일 선택 영역 */}
      <div className="file-selection-area">
        <input
          type="file"
          id="file-input"
          multiple
          accept=".wav,.mp3,.aiff,.flac,.m4a,.ogg"
          onChange={handleFileSelection}
          className="hidden"
        />
        <label
          htmlFor="file-input"
          className="file-selection-button"
        >
          <div className="file-selection-content">
            <Plus size={48} className="text-purple-400 mb-4 mx-auto" />
            <h3 className="text-white text-xl font-semibold mb-2">Select Audio Files</h3>
            <p className="text-gray-400">Choose multiple files to upload at once</p>
            <p className="text-gray-500 text-sm mt-2">Supports: WAV, MP3, AIFF, FLAC, M4A, OGG</p>
          </div>
        </label>
      </div>

      {/* 선택된 파일 목록 */}
      {files.length > 0 && (
        <div className="selected-files-section">
          <h3 className="text-white text-lg font-semibold mb-4">
            Selected Files ({files.length})
          </h3>
          
          <div className="files-grid">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-header">
                  <div className="file-info">
                    <div className="file-icon">
                      <FileAudio size={20} className="text-purple-400" />
                    </div>
                    <div className="file-details">
                      <h4 className="file-name">{file.name}</h4>
                      <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="remove-file-button"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* 파일 메타데이터 입력 */}
                <div className="file-metadata">
                  <div className="metadata-row">
                    <div className="metadata-field">
                      <label className="metadata-label">Tag</label>
                      <select
                        value={file.tag}
                        onChange={(e) => onUpdateFile(file.id, { tag: e.target.value })}
                        className="metadata-select"
                      >
                        <option value="">Select Tag</option>
                        {tagOptions.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>

                    <div className="metadata-field">
                      <label className="metadata-label">Key</label>
                      <select
                        value={file.key}
                        onChange={(e) => onUpdateFile(file.id, { key: e.target.value })}
                        className="metadata-select"
                      >
                        <option value="">Select Key</option>
                        {keyOptions.map(key => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="metadata-field">
                    <label className="metadata-label">Description</label>
                    <textarea
                      value={file.description}
                      onChange={(e) => onUpdateFile(file.id, { description: e.target.value })}
                      className="metadata-textarea"
                      placeholder="Enter file description..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// File Upload Step Component - 새로운 워크플로우
const FileUploadStep: React.FC<{
  files: UploadedFile[];
  onUpdateFile: (id: string, updates: Partial<UploadedFile>) => void;
  projectId: string;
  sessionId: string | null;
}> = ({ files, onUpdateFile, projectId, sessionId }) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const [allFilesProcessed, setAllFilesProcessed] = React.useState(false);
  const { showToast } = useToast();
  const { setFileProcessingHandlers, clearFileProcessingHandlers } = useSocket();

  const selectedFiles = files.filter(f => f.isSelected);

  // 파일 처리 이벤트 핸들러 설정
  React.useEffect(() => {
    const handlers: FileProcessingHandlers = {
      onFileDuplicate: handleFileDuplicate,
      onProcessingApproved: handleProcessingApproved,
    };

    setFileProcessingHandlers(handlers);

    return () => {
      clearFileProcessingHandlers();
    };
  }, [selectedFiles]);

  // 중복 파일 처리
  const handleFileDuplicate = (event: FileDuplicateEvent) => {
    const file = selectedFiles.find(f => 
      f.name === event.fileName && f.processingStatus === 'waiting_hash'
    );
    
    if (file) {
      onUpdateFile(file.id, {
        processingStatus: 'duplicate',
        duplicateInfo: {
          duplicateHash: event.duplicateHash,
          originalFilePath: event.originalFilePath
        }
      });
      
      console.log(`File marked as duplicate: ${file.name}`);
    }
  };

  // 처리 승인 처리
  const handleProcessingApproved = (event: ProcessingApprovedEvent) => {
    const file = selectedFiles.find(f => 
      f.name === event.fileName && f.processingStatus === 'waiting_hash'
    );
    
    if (file) {
      onUpdateFile(file.id, {
        processingStatus: 'approved',
        stemHash: event.stemHash
      });
      
      // 웹소켓에서 승인 받은 후 후속 API 호출
      processApprovedFile(file, event.stemHash);
    }
  };

  // 승인된 파일의 후속 처리
  const processApprovedFile = async (file: UploadedFile, stemHash: string) => {
    try {
      onUpdateFile(file.id, { processingStatus: 'processing' });

      const categoryId = await getCategoryId();
      
      // stemFile 생성 (해시 포함)
      const createStemFileDto = {
        file_name: file.name,
        file_path: file.s3Url || '',
        category_id: categoryId,
        track_id: projectId,
        session_id: sessionId || '',
        key: file.key,
        tag: file.tag,
        description: file.description || '',
        stem_hash: stemHash // 웹소켓에서 받은 해시 포함
      };

      const stemFileResult = await stemFileService.createStemFile(createStemFileDto);
      console.log(`stemFile 생성 완료: ${file.name}`, stemFileResult);

      // sessionBest 생성 (필요한 경우)
      if (sessionId && stemFileResult.data) {
        try {
          const createSessionBestDto = {
            session_id: sessionId,
            category_id: categoryId,
            stem_id: stemFileResult.data.id,
          };

          const sessionBestResult = await sessionBestService.createSessionBest(createSessionBestDto);
          console.log(`sessionBest 생성 완료: ${file.name}`, sessionBestResult);

        } catch (error) {
          console.error(`sessionBest 생성 실패: ${file.name}`, error);
        }
      }

      onUpdateFile(file.id, {
        processingStatus: 'completed',
        isComplete: true,
        uploadProgress: 100
      });

      console.log(`파일 처리 완료: ${file.name}`);

    } catch (error) {
      console.error(`파일 처리 실패: ${file.name}`, error);
      onUpdateFile(file.id, {
        processingStatus: 'error',
        errorMessage: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  };

  const getCategoryId = async (): Promise<string> => {
    try {
      const response = await categoryService.getCategoryByTrackId(projectId);
      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0].id;
      } else {
        throw new Error('No categories found');
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw new Error('Failed to get category ID');
    }
  };

  // 병렬 업로드 시작
  const uploadAllFiles = React.useCallback(async () => {
    console.log('Starting parallel upload for', selectedFiles.length, 'files');
    setIsUploading(true);

    try {
      // 모든 파일을 병렬로 업로드
      const uploadPromises = selectedFiles.map(async (fileToUpload) => {
        if (!fileToUpload.file) {
          throw new Error(`File object missing for ${fileToUpload.name}`);
        }

        console.log(`업로드 시작: ${fileToUpload.name}`);
        
        onUpdateFile(fileToUpload.id, { processingStatus: 'uploading' });

        const onProgress = (progress: UploadProgress) => {
          const progressPercent = Math.floor((progress.uploadedBytes / progress.totalSize) * 100);
          onUpdateFile(fileToUpload.id, {
            uploadProgress: progressPercent
          });
        };

        // S3 업로드
        const result = await s3UploadService.uploadFile(
          fileToUpload.file,
          projectId,
          onProgress
        );

        console.log(`업로드 완료: ${fileToUpload.name}`, result);

        onUpdateFile(fileToUpload.id, {
          s3Url: result.location,
          uploadProgress: 100,
          processingStatus: 'waiting_hash'
        });

        // 업로드 완료 후 즉시 해시 생성 요청 (새로운 API 사용)
        const hashRequest = {
          file_name: fileToUpload.name,
          file_path: result.key,
          category_id: await getCategoryId(),
          track_id: projectId,
          session_id: sessionId || '',
          key: fileToUpload.key,
          tag: fileToUpload.tag,
          description: fileToUpload.description || '',
        };

        await stemFileService.createStemFile(hashRequest);
        console.log(`해시 생성 요청 완료: ${fileToUpload.name}`);

        return result;
      });

      // 모든 업로드 완료 대기
      await Promise.all(uploadPromises);
      
      console.log('모든 파일 업로드 완료, 웹소켓 응답 대기 중...');
      showToast('success', '모든 파일 업로드 완료', 3000);

    } catch (error) {
      console.error('업로드 실패:', error);
      showToast('error', '업로드 실패', 5000);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, projectId, sessionId]);

  // 모든 파일이 처리되었는지 확인
  React.useEffect(() => {
    const processedCount = selectedFiles.filter(f => 
      f.processingStatus === 'completed' || f.processingStatus === 'duplicate' || f.processingStatus === 'error'
    ).length;
    
    setAllFilesProcessed(processedCount === selectedFiles.length && selectedFiles.length > 0);
  }, [selectedFiles]);

  const getStatusIcon = (status: UploadedFile['processingStatus']) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-gray-400" />;
      case 'uploading':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      case 'waiting_hash':
        return <Loader2 size={16} className="text-yellow-400 animate-spin" />;
      case 'duplicate':
        return <AlertCircle size={16} className="text-orange-400" />;
      case 'approved':
        return <Loader2 size={16} className="text-green-400 animate-spin" />;
      case 'processing':
        return <Loader2 size={16} className="text-purple-400 animate-spin" />;
      case 'completed':
        return <Check size={16} className="text-green-400" />;
      case 'error':
        return <X size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: UploadedFile['processingStatus']) => {
    switch (status) {
      case 'pending': return '대기 중';
      case 'uploading': return '업로드 중';
      case 'waiting_hash': return '해시 생성 중';
      case 'duplicate': return '중복 파일';
      case 'approved': return '처리 승인됨';
      case 'processing': return '처리 중';
      case 'completed': return '완료';
      case 'error': return '오류';
      default: return '알 수 없음';
    }
  };

  const startUpload = () => {
    uploadAllFiles();
  };

  return (
    <div className="upload-container">
      <h2 className="upload-title">Upload Files</h2>
      <p className="text-gray-300 mb-6">
        Ready to upload {selectedFiles.length} files. Files will be processed in parallel.
      </p>

      {!isUploading && selectedFiles.length > 0 && !allFilesProcessed && (
        <div className="upload-start-section">
          <button
            onClick={startUpload}
            className="upload-start-button"
          >
            <Upload size={20} className="mr-2" />
            Start Parallel Upload ({selectedFiles.length} files)
          </button>
        </div>
      )}

      {/* 업로드 진행 상황 */}
      <div className="files-progress-section">
        {selectedFiles.map((file) => (
          <div key={file.id} className="file-progress-item">
            <div className="file-progress-header">
              <div className="file-info">
                <div className="file-icon">
                  <FileAudio size={20} className="text-purple-400" />
                </div>
                <div className="file-details">
                  <h4 className="file-name">{file.name}</h4>
                  <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              
              <div className="file-status">
                {getStatusIcon(file.processingStatus)}
                <span className="status-text">{getStatusText(file.processingStatus)}</span>
              </div>
            </div>

            {/* 진행률 바 */}
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${file.uploadProgress}%` }}
                />
              </div>
              <span className="progress-text">{file.uploadProgress}%</span>
            </div>

            {/* 상태별 추가 정보 */}
            {file.processingStatus === 'duplicate' && file.duplicateInfo && (
              <div className="status-info duplicate-info">
                <p className="text-orange-300">
                  이 파일은 이미 업로드된 파일과 중복됩니다.
                </p>
              </div>
            )}

            {file.processingStatus === 'error' && file.errorMessage && (
              <div className="status-info error-info">
                <p className="text-red-300">오류: {file.errorMessage}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {allFilesProcessed && (
        <div className="upload-completion-section">
          <div className="completion-message">
            <Check size={24} className="text-green-400" />
            <h3 className="text-white text-lg font-semibold">모든 파일 처리 완료!</h3>
            <p className="text-gray-300">다음 단계로 진행할 수 있습니다.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Check Step Component (기존과 동일)
const CheckStep: React.FC<{
  files: UploadedFile[];
  masterFiles: MasterFile[];
}> = ({ files}) => {
  const completedFiles = files.filter(f => f.processingStatus === 'completed');
  const duplicateFiles = files.filter(f => f.processingStatus === 'duplicate');
  const errorFiles = files.filter(f => f.processingStatus === 'error');

  // const getMasterFileName = (id?: string) => {
  //   if (!id) return 'No match';
  //   const masterFile = masterFiles.find(f => f.id === id);
  //   return masterFile ? masterFile.name : 'Unknown';
  // };

  return (
    <div className="upload-container">
      <h2 className="upload-title">Upload Results</h2>
      <p className="text-gray-300 mb-6">Review your upload results below.</p>

      {/* 성공한 파일들 */}
      {completedFiles.length > 0 && (
        <div className="result-section">
          <h3 className="text-green-400 text-lg font-semibold mb-4">
            Successfully Processed ({completedFiles.length})
          </h3>
          <div className="files-grid">
            {completedFiles.map((file) => (
              <div key={file.id} className="result-file-item success">
                <div className="file-header">
                  <div className="file-info">
                    <Check size={20} className="text-green-400" />
                    <div className="file-details">
                      <h4 className="file-name">{file.name}</h4>
                      <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
                <div className="file-metadata">
                  <p><strong>Tag:</strong> {file.tag || 'None'}</p>
                  <p><strong>Key:</strong> {file.key || 'None'}</p>
                  <p><strong>Hash:</strong> {file.stemHash ? `${file.stemHash.substring(0, 8)}...` : 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 중복 파일들 */}
      {duplicateFiles.length > 0 && (
        <div className="result-section">
          <h3 className="text-orange-400 text-lg font-semibold mb-4">
            Duplicate Files ({duplicateFiles.length})
          </h3>
          <div className="files-grid">
            {duplicateFiles.map((file) => (
              <div key={file.id} className="result-file-item warning">
                <div className="file-header">
                  <div className="file-info">
                    <AlertCircle size={20} className="text-orange-400" />
                    <div className="file-details">
                      <h4 className="file-name">{file.name}</h4>
                      <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
                <div className="file-metadata">
                  <p className="text-orange-300">이 파일은 이미 존재하는 파일과 중복됩니다.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 오류 파일들 */}
      {errorFiles.length > 0 && (
        <div className="result-section">
          <h3 className="text-red-400 text-lg font-semibold mb-4">
            Failed Files ({errorFiles.length})
          </h3>
          <div className="files-grid">
            {errorFiles.map((file) => (
              <div key={file.id} className="result-file-item error">
                <div className="file-header">
                  <div className="file-info">
                    <X size={20} className="text-red-400" />
                    <div className="file-details">
                      <h4 className="file-name">{file.name}</h4>
                      <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
                <div className="file-metadata">
                  <p className="text-red-300">오류: {file.errorMessage || '알 수 없는 오류'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Upload Page Component
const UploadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const projectId = searchParams.get('projectId');
  const sessionId = searchParams.get('sessionId');

  const [state, dispatch] = useReducer(commitReducer, {
    uploadedFiles: [],
    currentStep: 1,
  });

  const [masterFiles, setMasterFiles] = React.useState<MasterFile[]>([]);

  React.useEffect(() => {
    console.log('UploadPage mounted');
    console.log('User:', user ? 'logged in' : 'not logged in');
    console.log('ProjectId:', projectId);
    console.log('SessionId:', sessionId);
    console.log('Current step:', state.currentStep);
    
    if (!user || !projectId) {
      console.log('Missing user or projectId, showing toast and navigating');
      showToast('error', 'Invalid access. Please ensure you are logged in and have a valid project.');
      navigate('/dashboard');
      return;
    }

    const fetchMasterFiles = async () => {
      try {
        // 필요한 경우 마스터 파일 목록 조회
        setMasterFiles([]);
      } catch (error) {
        console.error('Failed to fetch master files:', error);
        showToast('error', 'Failed to load project information.');
      }
    };

    fetchMasterFiles();
  }, [user, projectId, navigate, showToast]);

  const handleNextStep = () => {
    if (state.currentStep < 3) {
      dispatch({ type: 'SET_STEP', payload: state.currentStep + 1 });
    }
  };

  const handlePrevStep = () => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', payload: state.currentStep - 1 });
    }
  };

  const handleCommit = () => {
    showToast('success', 'Files committed successfully!');
    navigate('/dashboard');
  };

  const canProceed = () => {
    switch (state.currentStep) {
      case 1:
        return state.uploadedFiles.some(f => f.isSelected && f.tag && f.key);
      case 2:
        const processedFiles = state.uploadedFiles.filter(f => 
          f.processingStatus === 'completed' || f.processingStatus === 'duplicate' || f.processingStatus === 'error'
        );
        return processedFiles.length === state.uploadedFiles.filter(f => f.isSelected).length && 
               state.uploadedFiles.some(f => f.isSelected);
      case 3:
        return state.uploadedFiles.some(f => f.processingStatus === 'completed');
      default:
        return false;
    }
  };

  const renderCurrentStep = () => {
    console.log('Rendering step:', state.currentStep);
    console.log('Files count:', state.uploadedFiles.length);
    
    switch (state.currentStep) {
      case 1:
        return (
          <FileSelectionStep
            files={state.uploadedFiles}
            masterFiles={masterFiles}
            onAddFile={(file) => dispatch({ type: 'ADD_FILE', payload: file })}
            onRemoveFile={(id) => dispatch({ type: 'REMOVE_FILE', payload: id })}
            onUpdateFile={(id, updates) => dispatch({ type: 'UPDATE_FILE', payload: { id, updates } })}
          />
        );
      case 2:
        return (
          <FileUploadStep
            files={state.uploadedFiles}
            onUpdateFile={(id, updates) => dispatch({ type: 'UPDATE_FILE', payload: { id, updates } })}
            projectId={projectId!}
            sessionId={sessionId}
          />
        );
      case 3:
        return (
          <CheckStep
            files={state.uploadedFiles}
            masterFiles={masterFiles}
          />
        );
      default:
        console.log('Unknown step:', state.currentStep);
        return null;
    }
  };

  if (!user || !projectId) {
    return (
      <div className="upload-page">
        <StepSidebar currentStep={1} />
        <div className="upload-content">
          <div className="upload-main">
            <div className="upload-container">
              <h2 className="upload-title">Loading...</h2>
              <p className="text-gray-300">
                {!user ? 'User not found' : 'Project ID not found'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <StepSidebar currentStep={state.currentStep} />
      
      <div className="upload-content">
        <div className="upload-main">
          {renderCurrentStep()}
        </div>

        <div className="upload-actions">
          <div className="action-buttons">
            {state.currentStep > 1 && (
              <button
                onClick={handlePrevStep}
                className="action-button secondary"
              >
                Previous
              </button>
            )}
            
            {state.currentStep < 3 && (
              <button
                onClick={handleNextStep}
                disabled={!canProceed()}
                className={`action-button primary ${!canProceed() ? 'disabled' : ''}`}
              >
                Next
              </button>
            )}
            
            {state.currentStep === 3 && (
              <button
                onClick={handleCommit}
                disabled={!canProceed()}
                className={`action-button primary ${!canProceed() ? 'disabled' : ''}`}
              >
                Complete Upload
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;