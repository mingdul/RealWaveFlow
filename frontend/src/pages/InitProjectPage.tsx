import React, { useReducer, useEffect } from 'react';
import { Check, X, FileAudio, Upload, Plus } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './UploadPage.css';
import Logo from '../components/Logo';
import { UploadProgress, User } from '../types/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';  
import s3UploadService from '../services/s3UploadService';
import stemFileService from '../services/stemFileService';
import categoryService from '../services/categoryService';
import masterTakeService from '../services/masterTakeService';
import masterStemService from '../services/masterStemService';
import sessionService from '../services/sessionService';
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
}

interface CommitState {
  uploadedFiles: UploadedFile[];
  currentStep: number;
}

const tagOptions = ['BASS', 'DRUM', 'VOCAL', 'SYNTH', 'GUITAR', 'LEAD', 'HARMONY', 'OTHER'];
const keyOptions = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Aminor', 'Cmajor'];

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

const StepSidebar: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: 'Select & Configure Files', description: 'Choose files and set metadata & matching' },
    { number: 2, title: 'Upload Files',           description: 'Upload the selected files to the server' },
    { number: 3, title: 'Init Project',           description: 'Check the files and initialize the project' }
  ];
  return (
    <div className="step-sidebar">
      <div className="brand-section"><Logo/></div>
      <h2 className="commit-title">Init Project</h2>
      <p className="text-gray-300 mb-6">Choose the audio files you want to add to this project.</p>
      <div className="steps-container">
        {steps.map(step => (
          <div key={step.number} className="step-item">
            <div className={`step-number ${
                currentStep > step.number
                  ? 'step-number-completed'
                  : currentStep === step.number
                  ? 'step-number-current'
                  : 'step-number-inactive'
            }`}>
              {currentStep > step.number
                ? <Check size={16} className="text-white" />
                : <span className="text-white text-sm font-medium">{step.number}</span>}
            </div>
            <div className="step-content">
              <h3 className={`step-title ${
                  currentStep >= step.number
                    ? 'step-title-active'
                    : 'step-title-inactive'
              }`}>{step.title}</h3>
              <p className={`step-description ${
                  currentStep >= step.number
                    ? 'step-description-active'
                    : 'step-description-inactive'
              }`}>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FileSelectionStep: React.FC<{
  files: UploadedFile[];
  onAddFile: (file: UploadedFile) => void;
  onRemoveFile: (id: string) => void;
  onUpdateFile: (id: string, updates: Partial<UploadedFile>) => void;
}> = ({ files, onAddFile, onRemoveFile, onUpdateFile }) => {
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    Array.from(selectedFiles).forEach(file => {
      if (files.some(f => f.name === file.name)) return;
      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name, size: file.size,
        tag: '', key: '', description: '',
        uploadProgress: 0, isComplete: false,
        isSelected: true, file
      };
      onAddFile(newFile);
    });
    e.target.value = '';
  };

  return (
    <div className="upload-container">
      <h2 className="upload-title">Select Files to Upload</h2>
      <p className="text-gray-300 mb-6">Choose the audio files you want to add to upload.</p>
      <div className="file-selection-area">
        <input type="file" id="file-input" multiple accept=".wav,.mp3,.aiff,.flac,.m4a,.ogg"
               onChange={handleFileSelection} className="hidden" />
        <label htmlFor="file-input" className="file-selection-button">
          <div className="file-selection-content">
            <Plus size={48} className="text-purple-400 mb-4 mx-auto" />
            <h3 className="text-white text-xl font-semibold mb-2">Select Audio Files</h3>
            <p className="text-gray-400">Choose multiple files to upload at once</p>
            <p className="text-gray-500 text-sm mt-2">Supports: WAV, MP3, AIFF, FLAC, M4A, OGG</p>
          </div>
        </label>
      </div>
      {files.length > 0 && (
        <div className="file-list mt-8">
          <h3 className="text-white text-lg font-semibold mb-4">Selected Files ({files.length})</h3>
          {files.map(file => (
            <div key={file.id} className="file-item">
              <div className="file-content">
                <FileAudio className="text-gray-400" size={24} />
                <div className="file-details-section">
                  <span className="text-white font-medium">{file.name}</span>
                  <span className="text-gray-400 text-sm">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <div className="file-metadata">
                  <div className="file-field">
                    <label className="file-field-label">tag</label>
                    <select value={file.tag}
                            onChange={e => onUpdateFile(file.id, { tag: e.target.value })}
                            className="file-select">
                      <option value="">Select tag</option>
                      {tagOptions.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  </div>
                  <div className="file-field">
                    <label className="file-field-label">key</label>
                    <select value={file.key}
                            onChange={e => onUpdateFile(file.id, { key: e.target.value })}
                            className="file-select">
                      <option value="">Select key</option>
                      {keyOptions.map(key => <option key={key} value={key}>{key}</option>)}
                    </select>
                  </div>
                  <div className="file-field">
                    <label className="file-field-label">description</label>
                    <input type="text" value={file.description}
                           onChange={e => onUpdateFile(file.id, { description: e.target.value })}
                           placeholder="Enter description" className="file-input" />
                  </div>
                </div>
                <button onClick={() => onRemoveFile(file.id)}
                        className="file-remove-btn p-1 bg-red-500 hover:bg-red-600 rounded">
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FileUploadStep: React.FC<{
  files: UploadedFile[];
  onUpdateFile: (id: string, updates: Partial<UploadedFile>) => void;
  projectId: string;
  projectName: string;
  projectDescription: string;
  user: User | null;
}> = ({ files, onUpdateFile, projectId, user }) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = React.useState(0);

  const selectedFiles = files.filter(f => f.isSelected && !f.isComplete);
  const completedFiles = files.filter(f => f.isComplete);

  const uploadAllFiles = React.useCallback(async () => {
    setIsUploading(true);

    // 1) MasterTake & Session 생성 (순차)
    let masterTakeResult, sessionResult;
    try {
      masterTakeResult = await masterTakeService.createMasterTake({ track_id: projectId });
      sessionResult    = await sessionService.createSession({ name: 'init session', track_id: projectId });
    } catch (e) {
      console.error('Init failed', e);
      setIsUploading(false);
      return;
    }

    // 2) S3 업로드만 병렬 처리
    const uploadPromises = selectedFiles.map(fileToUpload => {
      if (!fileToUpload.file) return Promise.resolve({ error: true, id: fileToUpload.id });

      return s3UploadService.uploadFile(
        fileToUpload.file,
        projectId,
        (progress: UploadProgress) => {
          const pct = Math.floor((progress.uploadedBytes / progress.totalSize) * 100);
          onUpdateFile(fileToUpload.id, { uploadProgress: pct });
        }
      )
      .then(result => ({
        error: false,
        id: fileToUpload.id,
        result,
        file: fileToUpload
      }))
      .catch(err => {
        console.error(`S3 upload failed for ${fileToUpload.name}`, err);
        return { error: true, id: fileToUpload.id };
      });
    });

    const s3Results = await Promise.all(uploadPromises);

    // 3) 후속 API 호출 (순차 실행)
    for (let i = 0; i < s3Results.length; i++) {
      const res = s3Results[i];
      setCurrentUploadIndex(i);
      if (res.error || !('file' in res) || !('result' in res)) continue;
      const { file, result } = res as { error: false; id: string; result: any; file: UploadedFile };

      try {
        const category = await categoryService.createCategory({
          name: result.fileName, track_id: projectId
        });
        const stemFile = await stemFileService.createStemFile({
          file_name:   result.fileName,
          file_path:   result.key,
          key:         file.key || '',
          track_id:    projectId,
          session_id:  sessionResult.data.id,
          category_id: category.data.id,
          tag:         file.tag,
          description: file.description
        });
        await masterStemService.createMasterStem({
          file_path:     result.key,
          file_name:     result.fileName,
          key:           file.key,
          tag:           file.tag,
          description:   file.description,
          track_id:      projectId,
          category_id:   category.data.id,
          masterTake_id: masterTakeResult.data.id,
          take:          masterTakeResult.data.take,
          uploaded_by:   user!.id.toString()
        });
        if (stemFile.data) {
          await sessionBestService.createSessionBest({
            session_id: sessionResult.data.id,
            category_id: category.data.id,
            stem_id:     stemFile.data.id
          });
        }

        onUpdateFile(file.id, {
          uploadProgress: 100,
          isComplete:     true,
          isSelected:     false,
          s3Url:          result.location
        });
      } catch (e) {
        console.error(`Post-upload APIs failed for ${file.name}`, e);
      }
    }

    setIsUploading(false);
    setCurrentUploadIndex(0);
  }, [selectedFiles, onUpdateFile, projectId, user]);

  return (
    <div className="upload-container">
      <h2 className="upload-title">Upload Files</h2>
      <p className="text-gray-300 mb-6">
        Ready to upload {selectedFiles.length} files to the server.
      </p>

      {!isUploading && selectedFiles.length > 0 && (
        <button onClick={() => uploadAllFiles()} className="upload-start-button">
          <Upload size={20} className="mr-2" />
          Start Upload ({selectedFiles.length} files)
        </button>
      )}

      {isUploading && (
        <div className="upload-progress-section mb-6">
          <h3 className="text-white text-lg font-semibold">
            Uploading {currentUploadIndex + 1} of {selectedFiles.length} files...
          </h3>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                 style={{ width: `${Math.round(((currentUploadIndex) / selectedFiles.length) * 100)}%` }} />
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {Math.round(((currentUploadIndex) / selectedFiles.length) * 100)}% Complete
          </p>
        </div>
      )}

      {/* 파일 리스트 & 완료 뷰는 생략 (기존과 동일) */}
      {files.map(file => {
        const idx = selectedFiles.findIndex(sf => sf.id === file.id);
        const isCurrent = isUploading && idx === currentUploadIndex;
        return (
          <div key={file.id} className={`file-item ${isCurrent ? 'border-2 border-purple-500 bg-purple-900/20' : ''}`}>
            {/* ... (이전 UI 렌더링 로직 그대로) */}
          </div>
        );
      })}

      {completedFiles.length > 0 && selectedFiles.length === 0 && (
        <div className="upload-complete-section">
          <Check size={48} className="text-green-400" />
          <h3 className="text-white text-xl font-semibold mt-4">Upload Complete!</h3>
          <p className="text-gray-300">
            Successfully uploaded {completedFiles.length} files.
          </p>
        </div>
      )}
    </div>
  );
};

const CheckStep: React.FC<{ files: UploadedFile[] }> = ({ files }) => {
  return (
    <div className="check-container">
      <h2 className="check-title">Review Commit</h2>
      <p className="check-description">Review your changes before committing to the master.</p>
      <div className="summary-table">
        {files.filter(f => f.isComplete).map(file => (
          <div key={file.id} className="summary-item">
            {/* ... 기존 요약 UI */}
          </div>
        ))}
      </div>
    </div>
  );
};

const InitProjectPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { showError, showSuccess } = useToast();
  const projectId = searchParams.get('projectId');
  const projectName = searchParams.get('projectName') || 'New Project';
  const projectDescription = searchParams.get('projectDescription') || 'New music project';
  const [state, dispatch] = useReducer(commitReducer, { uploadedFiles: [], currentStep: 1 });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!projectId) { 
      showError('프로젝트 ID가 필요합니다.'); 
      navigate('/dashboard'); 
      return;
    }
  }, [isAuthenticated, projectId, navigate, showError]);

  const handleNext = () => dispatch({ type: 'SET_STEP', payload: state.currentStep + 1 });
  const handlePrev = () => dispatch({ type: 'SET_STEP', payload: state.currentStep - 1 });
  const handleCommit = () => { showSuccess('파일 업로드 완료'); navigate(`/master?trackId=${projectId}`); };
  const canProceed = () => {
    if (state.currentStep === 1) return state.uploadedFiles.some(f => f.isSelected);
    if (state.currentStep === 2) return state.uploadedFiles.filter(f => f.isSelected).every(f => f.isComplete);
    return true;
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <FileSelectionStep
          files={state.uploadedFiles}
          onAddFile={file => dispatch({ type: 'ADD_FILE', payload: file })}
          onRemoveFile={id => dispatch({ type: 'REMOVE_FILE', payload: id })}
          onUpdateFile={(id, u) => dispatch({ type: 'UPDATE_FILE', payload: { id, updates: u } })}
        />;
      case 2:
        return <FileUploadStep
          files={state.uploadedFiles}
          onUpdateFile={(id, u) => dispatch({ type: 'UPDATE_FILE', payload: { id, updates: u } })}
          projectId={projectId!}
          projectName={projectName}
          projectDescription={projectDescription}
          user={user}
        />;
      case 3:
        return <CheckStep files={state.uploadedFiles} />;
      default:
        return null;
    }
  };

  if (!isAuthenticated || !user || !projectId) return null;

  return (
    <div className="commit-page">
      <StepSidebar currentStep={state.currentStep} />
      <div className="commit-content">
        <div className="commit-main">{renderStep()}</div>
        <div className="navigation-bar">
          <button onClick={handlePrev} disabled={state.currentStep === 1} className="nav-btn nav-btn-prev">
            Before Step
          </button>
          <button
            onClick={state.currentStep === 3 ? handleCommit : handleNext}
            disabled={!canProceed()}
            className="nav-btn nav-btn-next"
          >
            {state.currentStep === 3 ? 'Commit' : 'Next Step'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InitProjectPage;
