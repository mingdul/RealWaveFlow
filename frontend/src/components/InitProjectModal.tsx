import React, { useReducer} from 'react';
// import { useEffect } from 'react';
import { Check, X, FileAudio, Upload, Plus } from 'lucide-react';
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
  isUploading: boolean;
  currentUploadIndex: number;
}

interface InitProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectDescription: string;
  onComplete: () => void;
}

const tagOptions = ['BASS', 'DRUM', 'VOCAL', 'SYNTH', 'GUITAR', 'LEAD', 'HARMONY', 'OTHER'];
const keyOptions = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Aminor', 'Cmajor'];

const commitReducer = (state: CommitState, action: any): CommitState => {
  switch (action.type) {
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
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    case 'SET_CURRENT_UPLOAD_INDEX':
      return { ...state, currentUploadIndex: action.payload };
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
  onStartUpload 
}) => {
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

  const selectedFiles = files.filter(f => f.isSelected && !f.isComplete);
  const completedFiles = files.filter(f => f.isComplete);
  const canStartUpload = selectedFiles.length > 0 && selectedFiles.every(f => f.tag && f.key);

  return (
    <div className="p-6 max-h-[70vh] overflow-y-auto">
      <h2 className="text-xl font-bold text-white mb-2">Upload Audio Files</h2>
      <p className="text-gray-400 mb-6">Choose audio files, set their metadata, and upload them to the project.</p>
      
      {/* File Selection Area */}
      <div className="mb-6">
        <input type="file" id="modal-file-input" multiple accept=".wav,.mp3,.aiff,.flac,.m4a,.ogg"
               onChange={handleFileSelection} className="hidden" />
        <label htmlFor="modal-file-input" className="block w-full p-6 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/10 transition-all duration-200">
          <div className="text-center">
            <Plus size={28} className="text-purple-400 mb-3 mx-auto" />
            <h3 className="text-white text-lg font-semibold mb-2">Select Audio Files</h3>
            <p className="text-gray-400 text-sm">Choose multiple files to upload at once</p>
            <p className="text-gray-500 text-xs mt-2">Supports: WAV, MP3, AIFF, FLAC, M4A, OGG</p>
          </div>
        </label>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-white text-lg font-semibold">
            Uploading {currentUploadIndex + 1} of {selectedFiles.length} files...
          </h3>
          <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                 style={{ width: `${Math.round(((currentUploadIndex) / selectedFiles.length) * 100)}%` }} />
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {Math.round(((currentUploadIndex) / selectedFiles.length) * 100)}% Complete
          </p>
        </div>
      )}

      {/* Upload Button */}
      {!isUploading && selectedFiles.length > 0 && (
        <div className="mb-6">
          <button 
            onClick={onStartUpload} 
            disabled={!canStartUpload}
            className={`w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors ${!canStartUpload ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload size={20} className="mr-2" />
            Start Upload ({selectedFiles.length} files)
          </button>
          {!canStartUpload && (
            <p className="text-amber-400 text-sm mt-2 text-center">
              Please set tag and key for all selected files before uploading
            </p>
          )}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white text-lg font-semibold mb-3">Files ({files.length})</h3>
          {files.map(file => {
            const idx = selectedFiles.findIndex(sf => sf.id === file.id);
            const isCurrent = isUploading && idx === currentUploadIndex;
            return (
              <div key={file.id} className={`border rounded-lg p-4 transition-all ${isCurrent ? 'border-purple-500 bg-purple-900/20 shadow-lg' : 'border-gray-600 bg-gray-800 hover:border-gray-500'}`}>
                <div className="flex items-start space-x-3">
                  <FileAudio className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium text-sm truncate">{file.name}</span>
                        <span className="text-gray-400 text-xs whitespace-nowrap">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        {file.isComplete && (
                          <span className="text-green-400 text-xs font-medium">✓ Uploaded</span>
                        )}
                      </div>
                      {!file.isComplete && (
                        <button 
                          onClick={() => onRemoveFile(file.id)}
                          className="p-1 text-red-400 hover:text-red-500 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Tag</label>
                        <select 
                          value={file.tag}
                          onChange={e => onUpdateFile(file.id, { tag: e.target.value })}
                          disabled={file.isComplete}
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select tag</option>
                          {tagOptions.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Key</label>
                        <select 
                          value={file.key}
                          onChange={e => onUpdateFile(file.id, { key: e.target.value })}
                          disabled={file.isComplete}
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select key</option>
                          {keyOptions.map(key => <option key={key} value={key}>{key}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Description</label>
                        <input 
                          type="text" 
                          value={file.description}
                          onChange={e => onUpdateFile(file.id, { description: e.target.value })}
                          disabled={file.isComplete}
                          placeholder="Enter description" 
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                        />
                      </div>
                    </div>
                    
                    {file.uploadProgress > 0 && file.uploadProgress < 100 && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${file.uploadProgress}%` }} 
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{file.uploadProgress}%</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Complete */}
      {completedFiles.length > 0 && selectedFiles.length === 0 && !isUploading && (
        <div className="text-center py-8 bg-green-900/20 rounded-lg border border-green-500/30 mt-6">
          <Check size={48} className="text-green-400 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">Upload Complete!</h3>
          <p className="text-gray-300 mb-4">
            Successfully uploaded {completedFiles.length} file{completedFiles.length > 1 ? 's' : ''}.
          </p>
          <p className="text-gray-400 text-sm">
            You can now complete the project setup or add more files.
          </p>
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
  onComplete 
}) => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [state, dispatch] = useReducer(commitReducer, { 
    uploadedFiles: [], 
    isUploading: false, 
    currentUploadIndex: 0 
  });

  const handleStartUpload = React.useCallback(async () => {
    dispatch({ type: 'SET_UPLOADING', payload: true });
    
    const selectedFiles = state.uploadedFiles.filter(f => f.isSelected && !f.isComplete);

    // 1) MasterTake & Session 생성 (순차) => POST /stem-job/init-start 호출 (Track + Stage 생성) 로 바꾸기
    let masterTakeResult, sessionResult;
    try {
      sessionResult    = await sessionService.createSession({ name: 'init session', track_id: projectId });
      masterTakeResult = await masterTakeService.createMasterTake({ track_id: projectId });
    } catch (e) {
      console.error('Init failed', e);
      dispatch({ type: 'SET_UPLOADING', payload: false });
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
          dispatch({ type: 'UPDATE_FILE', payload: { id: fileToUpload.id, updates: { uploadProgress: pct } } });
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
      dispatch({ type: 'SET_CURRENT_UPLOAD_INDEX', payload: i });
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

        dispatch({ type: 'UPDATE_FILE', payload: { 
          id: file.id, 
          updates: {
            uploadProgress: 100,
            isComplete:     true,
            isSelected:     false,
            s3Url:          result.location
          }
        }});
      } catch (e) {
        console.error(`Post-upload APIs failed for ${file.name}`, e);
      }
    }

    dispatch({ type: 'SET_UPLOADING', payload: false });
    dispatch({ type: 'SET_CURRENT_UPLOAD_INDEX', payload: 0 });
  }, [state.uploadedFiles, projectId, user]);

  const handleComplete = () => { 
    if (completedFiles.length === 0) {
      showError('업로드된 파일이 없습니다. 파일을 업로드한 후 완료해주세요.');
      return;
    }
    showSuccess('파일 업로드 완료'); 
    onComplete();
  };

  const completedFiles = state.uploadedFiles.filter(f => f.isComplete);
  const canComplete = completedFiles.length > 0 && !state.isUploading;

  const handleCloseModal = () => {
    if (state.isUploading) {
      showError('업로드 중에는 모달을 닫을 수 없습니다.');
      return;
    }
    
    if (state.uploadedFiles.length > 0 && completedFiles.length === 0) {
      const confirmClose = window.confirm('업로드되지 않은 파일이 있습니다. 정말로 닫으시겠습니까?');
      if (!confirmClose) return;
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={handleCloseModal}
    >
      <div 
        className="bg-gray-800 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Init Project</h2>
            <p className="text-gray-400 text-sm mt-1">{projectName}</p>
          </div>
          <button 
            onClick={handleCloseModal}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <FileSelectionAndUploadStep
            files={state.uploadedFiles}
            onAddFile={file => dispatch({ type: 'ADD_FILE', payload: file })}
            onRemoveFile={id => dispatch({ type: 'REMOVE_FILE', payload: id })}
            onUpdateFile={(id, updates) => dispatch({ type: 'UPDATE_FILE', payload: { id, updates } })}
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
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900/50 rounded-b-xl">
          <button 
            onClick={handleCloseModal} 
            disabled={state.isUploading}
            className={`px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium ${state.isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className={`px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium ${!canComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
};

export default InitProjectModal; 