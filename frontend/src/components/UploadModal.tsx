import React, { useReducer, useEffect} from 'react';
// import { useState } from 'react';
import { Check, X, FileAudio, Upload,  Play, Plus, Music, Drum, Mic, Zap, Guitar, Volume2, Users, MoreHorizontal } from 'lucide-react';
// import {Plus, ArrowRight} from 'lucide-react';
import { UploadProgress, MasterStem } from '../types/api';
// import { StemFile, User } from '../types/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import s3UploadService from '../services/s3UploadService';
import { createUpstream } from '../services/upstreamService';
import versionstemService from '../services/versionstemService';
import stemJobService from '../services/stemJobService';
// import stemFileService from '../services/stemFileService';
// import categoryService from '../services/categoryService';
// import masterStemService from '../services/masterStemService';
// import sessionService from '../services/sessionService';
// import sessionBestService from '../services/sessionBestService';

// Types
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  tag: string;
  key: string;
  bpm?: string;
  description: string;
  uploadProgress: number;
  isComplete: boolean;
  matchedStemId?: string;
  stemId?: string; // 실제 생성된 stem ID
  s3Url?: string;
  file?: File;
  isMatched: boolean;
}

interface UploadState {
  uploadedFiles: UploadedFile[];
  existingStems: MasterStem[];
  isUploading: boolean;
  currentUploadIndex: number;
  isLoadingStems: boolean;
  description: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  stageId?: string;
  stageVersion?: number;
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
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-500' },
];

const keyOptions = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Aminor', 'Cmajor'];

// const tagOptions = ['BASS', 'DRUM', 'VOCAL', 'SYNTH', 'GUITAR', 'LEAD', 'HARMONY', 'OTHER'];
// const keyOptions = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Aminor', 'Cmajor'];

const uploadReducer = (state: UploadState, action: any): UploadState => {
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
    case 'SET_EXISTING_STEMS':
      return { ...state, existingStems: action.payload };
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    case 'SET_CURRENT_UPLOAD_INDEX':
      return { ...state, currentUploadIndex: action.payload };
    case 'SET_LOADING_STEMS':
      return { ...state, isLoadingStems: action.payload };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };
    default:
      return state;
  }
};



const StemListPanel: React.FC<{
  stems: MasterStem[];
  uploadedFiles: UploadedFile[];
  onStemPlay?: (stemId: string) => void;
  onAddFile: (file: UploadedFile) => void;
  onUpdateFile: (id: string, updates: Partial<UploadedFile>) => void;
  onMatchStem: (fileId: string, stemId: string) => void;
  isUploading: boolean;
}> = ({ stems, uploadedFiles, onStemPlay, onAddFile, onUpdateFile, isUploading }) => {
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>, stemId?: string) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    Array.from(selectedFiles).forEach(file => {
      if (uploadedFiles.some(f => f.name === file.name)) return;
      
      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        tag: '',
        key: '',
        bpm: '',
        description: '',
        uploadProgress: 0,
        isComplete: false,
        isMatched: !!stemId,
        matchedStemId: stemId,
        file
      };
      onAddFile(newFile);
    });
    e.target.value = '';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-4 px-4 text-gray-400 font-medium">Current Stems</th>
            <th className="text-left py-4 px-4 text-gray-400 font-medium">Upload New Version</th>
          </tr>
        </thead>
        <tbody>
          {stems.map((stem) => {
            const matchedFile = uploadedFiles.find(f => f.matchedStemId === stem.id);
            
            return (
              <tr key={stem.id} className="border-b border-gray-700">
                {/* Current Stem Info */}
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onStemPlay?.(stem.id)}
                      className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 rounded-lg transition-colors"
                    >
                      <Play size={16} />
                    </button>
                    <div>
                      <div className="text-white font-medium">{stem.file_name}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        {stem.tag && (
                          <span className="bg-purple-900 text-purple-300 px-2 py-1 rounded text-xs">
                            {stem.tag}
                          </span>
                        )}
                        {stem.key && (
                          <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs">
                            {stem.key}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                
                {/* Upload New Version */}
                <td className="py-4 px-4">
                  {matchedFile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileAudio className="text-gray-400" size={20} />
                          <div>
                            <span className="text-white font-medium text-sm">{matchedFile.name}</span>
                            <span className="text-gray-400 text-xs ml-2">
                              {(matchedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => onUpdateFile(matchedFile.id, { isMatched: false, matchedStemId: undefined })}
                          disabled={isUploading}
                          className="p-1 text-red-400 hover:text-red-500 hover:bg-red-400/10 rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      
                      {matchedFile.uploadProgress > 0 && matchedFile.uploadProgress < 100 && (
                        <div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${matchedFile.uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{matchedFile.uploadProgress}%</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        id={`upload-${stem.id}`}
                        accept=".wav,.mp3,.aiff,.flac,.m4a,.ogg"
                        onChange={(e) => handleFileSelection(e, stem.id)}
                        className="hidden"
                      />
                      <label
                        htmlFor={`upload-${stem.id}`}
                        className="flex items-center justify-center p-4 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/10 transition-all duration-200"
                      >
                        <div className="text-center">
                          <Upload size={24} className="text-purple-400 mb-2 mx-auto" />
                          <p className="text-white font-medium">Upload New Version</p>
                        </div>
                      </label>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Add New Stem Section */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-semibold">Add New Stem</h3>
        </div>
        
        {/* New Stem Files List */}
        {uploadedFiles.filter(f => !f.isMatched).length > 0 && (
          <div className="space-y-3 mb-4">
            {uploadedFiles.filter(f => !f.isMatched).map(file => (
              <div key={file.id} className="border rounded-lg p-4 border-gray-600 bg-gray-800 hover:border-gray-500">
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
                          onClick={() => onUpdateFile(file.id, { isMatched: false, matchedStemId: undefined })}
                          className="p-1 text-red-400 hover:text-red-500 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <label className="block text-gray-400 text-xs mb-2">Instrument</label>
                        <div className="grid grid-cols-8 gap-1">
                          {tagOptions.map(tag => {
                            const Icon = tag.icon;
                            return (
                              <button
                                key={tag.value}
                                type="button"
                                onClick={() => onUpdateFile(file.id, { tag: tag.value })}
                                disabled={file.isComplete}
                                className={`relative p-2 rounded-lg border-2 transition-all duration-200 ${file.tag === tag.value
                                    ? `${tag.color} border-white text-white`
                                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                                  } ${file.isComplete ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                                title={tag.label}
                              >
                                <Icon size={16} />
                                {file.tag === tag.value && (
                                  <div className="absolute -top-1 -right-1 bg-white rounded-full w-3 h-3 flex items-center justify-center">
                                    <Check size={8} className="text-gray-800" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {file.tag && (
                          <p className="text-xs text-gray-400 mt-1">
                            {tagOptions.find(t => t.value === file.tag)?.label}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Key <span className="text-gray-500">(optional)</span></label>
                        <select
                          value={file.key}
                          onChange={e => onUpdateFile(file.id, { key: e.target.value })}
                          disabled={file.isComplete}
                          className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select key (optional)</option>
                          {keyOptions.map(key => <option key={key} value={key}>{key}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">BPM <span className="text-gray-500">(optional)</span></label>
                        <input
                          type="text"
                          value={file.bpm || ''}
                          onChange={e => onUpdateFile(file.id, { bpm: e.target.value })}
                          disabled={file.isComplete}
                          placeholder="e.g. 120 (optional)"
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
            ))}
          </div>
        )}
        
        {/* Add New Stem Button */}
        <div>
          <input
            type="file"
            id="add-new-stem-input"
            accept=".wav,.mp3,.aiff,.flac,.m4a,.ogg"
            onChange={(e) => handleFileSelection(e)}
            className="hidden"
          />
          <label
            htmlFor="add-new-stem-input"
            className="flex items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/10 transition-all duration-200"
          >
            <div className="text-center">
              <Plus size={24} className="text-purple-400 mb-2 mx-auto" />
              <p className="text-white font-medium">Add New Stem</p>
              <p className="text-gray-400 text-sm">Select audio file to add as new stem</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

// const UploadPanel: React.FC<{
//   existingStems: MasterStem[];
//   uploadedFiles: UploadedFile[];
//   onAddFile: (file: UploadedFile) => void;
//   onUpdateFile: (id: string, updates: Partial<UploadedFile>) => void;
//   onMatchStem: (fileId: string, stemId: string) => void;
//   isUploading: boolean;
// }> = ({ existingStems, uploadedFiles, onAddFile, onUpdateFile, onMatchStem, isUploading }) => {
  
//   const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const selectedFiles = e.target.files;
//     if (!selectedFiles) return;
    
//     Array.from(selectedFiles).forEach(file => {
//       if (uploadedFiles.some(f => f.name === file.name)) return;
      
//       const newFile: UploadedFile = {
//         id: Math.random().toString(36).substr(2, 9),
//         name: file.name,
//         size: file.size,
//         tag: '',
//         key: '',
//         description: '',
//         uploadProgress: 0,
//         isComplete: false,
//         isMatched: false,
//         file
//       };
//       onAddFile(newFile);
//     });
//     e.target.value = '';
//   };

//   const matchedFiles = uploadedFiles.filter(f => f.isMatched);
//   const unmatchedFiles = uploadedFiles.filter(f => !f.isMatched);

//   return (
//     <div className="h-full">
//       <h3 className="text-white text-lg font-semibold mb-4">Upload New Files</h3>
      
//       {/* File Selection Area */}
//       <div className="mb-4">
//         <input
//           type="file"
//           id="upload-modal-file-input"
//           multiple
//           accept=".wav,.mp3,.aiff,.flac,.m4a,.ogg"
//           onChange={handleFileSelection}
//           className="hidden"
//         />
//         <label
//           htmlFor="upload-modal-file-input"
//           className="block w-full p-4 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/10 transition-all duration-200"
//         >
//           <div className="text-center">
//             <Plus size={24} className="text-purple-400 mb-2 mx-auto" />
//             <p className="text-white font-medium">Select Files</p>
//             <p className="text-gray-400 text-sm">WAV, MP3, AIFF, FLAC, M4A, OGG</p>
//           </div>
//         </label>
//       </div>

//       {/* Stem Matching Section */}
//       <div className="space-y-4">
//         {existingStems.map((stem) => {
//           const matchedFile = matchedFiles.find(f => f.matchedStemId === stem.id);
          
//           return (
//             <div key={stem.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
//               <div className="flex items-center justify-between mb-3">
//                 <div className="flex items-center space-x-3">
//                   <div className="text-white font-medium text-sm">{stem.file_name}</div>
//                   <ArrowRight size={16} className="text-gray-400" />
//                 </div>
//                 <select
//                   onChange={(e) => {
//                     const fileId = e.target.value;
//                     if (fileId) {
//                       onMatchStem(fileId, stem.id);
//                     }
//                   }}
//                   value={matchedFile?.id || ''}
//                   disabled={isUploading}
//                   className="bg-gray-700 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 >
//                   <option value="">Select replacement file</option>
//                   {unmatchedFiles.map((file) => (
//                     <option key={file.id} value={file.id}>
//                       {file.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
              
//               {matchedFile && (
//                 <div className="grid grid-cols-2 gap-2 text-sm">
//                   <div>
//                     <label className="block text-gray-400 text-xs mb-1">Tag</label>
//                     <select
//                       value={matchedFile.tag}
//                       onChange={(e) => onUpdateFile(matchedFile.id, { tag: e.target.value })}
//                       disabled={isUploading}
//                       className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
//                     >
//                       <option value="">Select tag</option>
//                       {tagOptions.map(tag => <option key={tag} value={tag}>{tag}</option>)}
//                     </select>
//                   </div>
//                   <div>
//                     <label className="block text-gray-400 text-xs mb-1">Key</label>
//                     <select
//                       value={matchedFile.key}
//                       onChange={(e) => onUpdateFile(matchedFile.id, { key: e.target.value })}
//                       disabled={isUploading}
//                       className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
//                     >
//                       <option value="">Select key</option>
//                       {keyOptions.map(key => <option key={key} value={key}>{key}</option>)}
//                     </select>
//                   </div>
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// const UnmatchedFilesPanel: React.FC<{
//   files: UploadedFile[];
//   onRemoveFile: (id: string) => void;
//   onUpdateFile: (id: string, updates: Partial<UploadedFile>) => void;
//   isUploading: boolean;
// }> = ({ files, onRemoveFile, onUpdateFile, isUploading }) => {
//   if (files.length === 0) return null;

//   return (
//     <div className="border-t border-gray-700 pt-4">
//       <h3 className="text-white text-lg font-semibold mb-4">New Stems</h3>
//       <div className="space-y-3">
//         {files.map((file) => (
//           <div key={file.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
//             <div className="flex items-start justify-between mb-3">
//               <div className="flex items-center space-x-2">
//                 <FileAudio className="text-gray-400" size={20} />
//                 <div>
//                   <span className="text-white font-medium text-sm">{file.name}</span>
//                   <span className="text-gray-400 text-xs ml-2">
//                     {(file.size / (1024 * 1024)).toFixed(2)} MB
//                   </span>
//                 </div>
//               </div>
//               <button
//                 onClick={() => onRemoveFile(file.id)}
//                 disabled={isUploading}
//                 className="p-1 text-red-400 hover:text-red-500 hover:bg-red-400/10 rounded transition-colors"
//               >
//                 <X size={16} />
//               </button>
//             </div>
            
//             <div className="grid grid-cols-3 gap-3 text-sm">
//               <div>
//                 <label className="block text-gray-400 text-xs mb-1">Tag</label>
//                 <select
//                   value={file.tag}
//                   onChange={(e) => onUpdateFile(file.id, { tag: e.target.value })}
//                   disabled={isUploading}
//                   className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 >
//                   <option value="">Select tag</option>
//                   {tagOptions.map(tag => <option key={tag} value={tag}>{tag}</option>)}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-gray-400 text-xs mb-1">Key</label>
//                 <select
//                   value={file.key}
//                   onChange={(e) => onUpdateFile(file.id, { key: e.target.value })}
//                   disabled={isUploading}
//                   className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 >
//                   <option value="">Select key</option>
//                   {keyOptions.map(key => <option key={key} value={key}>{key}</option>)}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-gray-400 text-xs mb-1">Description</label>
//                 <input
//                   type="text"
//                   value={file.description}
//                   onChange={(e) => onUpdateFile(file.id, { description: e.target.value })}
//                   disabled={isUploading}
//                   placeholder="Enter description"
//                   className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 />
//               </div>
//             </div>
            
//             {file.uploadProgress > 0 && file.uploadProgress < 100 && (
//               <div className="mt-2">
//                 <div className="w-full bg-gray-600 rounded-full h-2">
//                   <div
//                     className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
//                     style={{ width: `${file.uploadProgress}%` }}
//                   />
//                 </div>
//                 <p className="text-xs text-gray-400 mt-1">{file.uploadProgress}%</p>
//               </div>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  stageId,
  stageVersion,
  onComplete
}) => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [state, dispatch] = useReducer(uploadReducer, {
    uploadedFiles: [],
    existingStems: [],
    isUploading: false,
    currentUploadIndex: 0,
    isLoadingStems: false,
    description: ''
  });

  // Load existing stems
  useEffect(() => {
    if (isOpen && projectId && stageId) {
      dispatch({ type: 'SET_LOADING_STEMS', payload: true });
      
      // projectId is the track_id, and we need to get stage info to get version
      const trackId = projectId;
      const version = stageVersion ? stageVersion - 1 : 1; // stage.version - 1
      //
      
      versionstemService.getLatestStem(trackId, version)
        .then(response => {
          if (response && Array.isArray(response)) {
            // 백엔드 응답을 MasterStem 형태로 변환
            const stems = response.map((item: any) => ({
              id: item.stem.id,
              file_name: item.stem.file_name,
              file_path: item.stem.file_path,
              tag: item.category, // category name을 tag로 사용
              key: item.stem.key || '',
              description: `${item.category} stem`,
              track_id: item.stem.track?.id || '',
              category_id: item.stem.category?.id || '',
              session_id: item.stem.stage?.id || '',
              created_at: item.stem.uploaded_at || new Date().toISOString(),
              updated_at: item.stem.uploaded_at || new Date().toISOString()
            }));
            dispatch({ type: 'SET_EXISTING_STEMS', payload: stems });
          } else {
            dispatch({ type: 'SET_EXISTING_STEMS', payload: [] });
          }
        })
        .catch(error => {
          console.error('Failed to load existing stems:', error);
          showError('Failed to load existing stems');
          dispatch({ type: 'SET_EXISTING_STEMS', payload: [] });
        })
        .finally(() => {
          dispatch({ type: 'SET_LOADING_STEMS', payload: false });
        });
    }
  }, [isOpen, projectId, stageId, showError]);

  const handleMatchStem = (fileId: string, stemId: string) => {
    // Remove any existing match for this stem
    state.uploadedFiles.forEach(file => {
      if (file.matchedStemId === stemId) {
        dispatch({ type: 'UPDATE_FILE', payload: { id: file.id, updates: { isMatched: false, matchedStemId: undefined } } });
      }
    });

    // Set new match
    dispatch({ type: 'UPDATE_FILE', payload: { id: fileId, updates: { isMatched: true, matchedStemId: stemId } } });
  };

  const handleStartUpload = React.useCallback(async () => {
    const filesToUpload = state.uploadedFiles.filter(f => f.file && (f.isMatched || (!f.isMatched && f.tag)));
    
    if (filesToUpload.length === 0) {
      showError('No files to upload or missing metadata');
      return;
    }

    dispatch({ type: 'SET_UPLOADING', payload: true });

    try {
      // Upload files sequentially
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        dispatch({ type: 'SET_CURRENT_UPLOAD_INDEX', payload: i });

        if (!file.file) continue;

        try {
          // S3 Upload
          const uploadResult = await s3UploadService.uploadFile(
            file.file,
            projectId,
            (progress: UploadProgress) => {
              const pct = Math.floor((progress.uploadedBytes / progress.totalSize) * 100);
              dispatch({ type: 'UPDATE_FILE', payload: { id: file.id, updates: { uploadProgress: pct } } });
            }
          );

          // stem-job/create 호출하여 실제 stem job 생성
          try {
            const stemJobRequest = {
              file_name: uploadResult.fileName,
              file_path: uploadResult.key,
              key: file.key || '',
              bpm: file.bpm || '',
              stage_id: stageId || '',
              track_id: projectId,
              instrument: file.tag || 'OTHER',
            };

            console.log('[DEBUG] Creating stem job for:', file.name);
            console.log('[DEBUG] Stem job request data:', stemJobRequest);
            console.log('[DEBUG] File instrument tag:', file.tag);
            const stemJobResult = await stemJobService.dupCheck(stemJobRequest);
            console.log('[DEBUG] Stem job created:', stemJobResult);

            if (stemJobResult.success && (stemJobResult as any).job) {
              const stemJobId = (stemJobResult as any).job.id;
              console.log('[DEBUG] Stem job ID saved:', stemJobId);
              
              dispatch({ type: 'UPDATE_FILE', payload: {
                id: file.id,
                updates: {
                  uploadProgress: 100,
                  isComplete: true,
                  s3Url: uploadResult.location,
                  stemId: stemJobId // 실제 stem job ID 사용
                }
              }});

              // 새로운 카테고리 스템은 업로드만 하고, Complete 시점에 upstream 생성
              console.log('[DEBUG] New category stem uploaded, will create upstream on Complete:', file.name);
            } else {
              throw new Error('Failed to create stem job');
            }
          } catch (stemJobError) {
            console.error('[ERROR] Failed to create stem job for', file.name, ':', stemJobError);
            showError(`Failed to process ${file.name}. Please try again.`);
          }

        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          showError(`Upload failed for ${file.name}`);
        }
      }

      showSuccess('Upload completed successfully!');
    } catch (error) {
      console.error('Upload process failed:', error);
      showError('Upload process failed');
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
      dispatch({ type: 'SET_CURRENT_UPLOAD_INDEX', payload: 0 });
    }
  }, [state.uploadedFiles, projectId, user, showError, showSuccess]);

    const handleComplete = async () => {
    const completedReplacementFiles = state.uploadedFiles.filter(f => f.isComplete && f.matchedStemId);
    const completedNewCategoryFiles = state.uploadedFiles.filter(f => f.isComplete && !f.matchedStemId);
    const allCompletedFiles = state.uploadedFiles.filter(f => f.isComplete);
    
    // 완료된 파일이 없는 경우
    if (allCompletedFiles.length === 0) {
      showSuccess('All uploads completed successfully!');
      onComplete();
      onClose();
      return;
    }

    if (!stageId) {
      showError('Stage ID is required');
      return;
    }

    try {
      // 모든 기존 스템을 stem_set에 포함 (교체된 것과 안된 것 모두)
      const stemSet: any[] = [];
      const newCategoryStems: any[] = [];

      console.log('[DEBUG] Processing all existing stems:', state.existingStems);
      console.log('[DEBUG] Processing completed replacement files:', completedReplacementFiles);
      console.log('[DEBUG] Processing completed new category files:', completedNewCategoryFiles);

      // 모든 기존 스템에 대해 처리 (기존 스템이 있는 경우만)
      state.existingStems.forEach(existingStem => {
        const replacementFile = completedReplacementFiles.find(file => file.matchedStemId === existingStem.id);
        
        if (replacementFile && replacementFile.stemId) {
          // 교체된 경우: oldStem과 newStem 모두 포함
          stemSet.push({
            oldStem: existingStem.id,
            newStem: replacementFile.stemId
          });
          console.log('[DEBUG] Added replacement to stem_set:', { oldStem: existingStem.id, newStem: replacementFile.stemId });
        } else {
          // 교체되지 않은 경우: oldStem만 포함
          stemSet.push({
            oldStem: existingStem.id
          });
          console.log('[DEBUG] Added unchanged to stem_set:', { oldStem: existingStem.id });
        }
      });

      // 새로운 카테고리 스템 처리
      completedNewCategoryFiles.forEach(file => {
        if (file.stemId) {
          newCategoryStems.push({
            categoryName: file.tag || 'OTHER',
            newStemId: file.stemId,
            instrument: file.tag?.toLowerCase() || 'other'
          });
          console.log('[DEBUG] Added new category stem:', { 
            categoryName: file.tag || 'OTHER', 
            newStemId: file.stemId,
            instrument: file.tag?.toLowerCase() || 'other'
          });
        }
      });

      console.log('[DEBUG] Final stem_set:', stemSet);
      console.log('[DEBUG] Final new_category_stem:', newCategoryStems);

      // 처리할 스템이 없는 경우
      if (stemSet.length === 0 && newCategoryStems.length === 0) {
        showSuccess('All uploads completed successfully!');
        onComplete();
        onClose();
        return;
      }

      // 업스트림 생성 (모든 스템 포함)
      const replacementCount = completedReplacementFiles.length;
      const newStemCount = completedNewCategoryFiles.length;
      const upstreamData = {
        upstream: {
          title: `Stem Set ${new Date().toLocaleString()}`,
          description: state.description || `Updated stem set: ${replacementCount} replacement(s), ${newStemCount} new stem(s)`,
          stage_id: stageId,
          user_id: user?.id || '',
        },
        stem_set: stemSet,
        new_category_stem: newCategoryStems
      };

      console.log('[DEBUG] Creating upstream with all stems and new categories:', upstreamData);

      const response = await createUpstream(upstreamData);
      if (response.success) {
        showSuccess('Stem set update completed successfully!');
        onComplete();
        onClose();
      } else {
        showError('Failed to create stem set update');
      }
    } catch (error) {
      console.error('Error creating upstream:', error);
      showError('Failed to create stem set');
    }
  };

  const handleCloseModal = () => {
    if (state.isUploading) {
      showError('Cannot close modal while uploading');
      return;
    }
    
    const pendingFiles = state.uploadedFiles.filter(f => !f.isComplete);
    if (pendingFiles.length > 0) {
      const confirmClose = window.confirm('There are pending files. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    
    onClose();
  };

  if (!isOpen) return null;

//   const completedFiles = state.uploadedFiles.filter(f => f.isComplete);
//   const filesToUpload = state.uploadedFiles.filter(f => f.file && (f.isMatched || (!f.isMatched && f.tag && f.key)));
//   const canUpload = filesToUpload.length > 0 && !state.isUploading;
//   const canComplete = completedFiles.length > 0 && !state.isUploading;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={handleCloseModal}
    >
      <div
        className="bg-gray-800 rounded-xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Upload Files</h2>
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
        <div className="flex-1 p-6 overflow-auto">
          {/* Stem Set Description */}
          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Stem Set Description
            </label>
            <textarea
              value={state.description}
              onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
              placeholder="Enter description for this stem set..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
              maxLength={200}
            />
            <div className="text-right text-gray-500 text-xs mt-1">
              {state.description.length}/200
            </div>
          </div>

          {/* Upload Progress */}
          {state.isUploading && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-white text-lg font-semibold">
                Uploading {state.currentUploadIndex + 1} of {state.uploadedFiles.length} files...
              </h3>
              <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((state.currentUploadIndex / state.uploadedFiles.length) * 100)}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {Math.round((state.currentUploadIndex / state.uploadedFiles.length) * 100)}% Complete
              </p>
            </div>
          )}

          {/* Main content area */}
          {state.isLoadingStems ? (
            <div className="text-center text-gray-400">Loading existing stems...</div>
          ) : (
            <StemListPanel
              stems={state.existingStems}
              uploadedFiles={state.uploadedFiles}
              onStemPlay={(stemId) => console.log('Play stem:', stemId)}
              onAddFile={(file) => dispatch({ type: 'ADD_FILE', payload: file })}
              onUpdateFile={(id, updates) => dispatch({ type: 'UPDATE_FILE', payload: { id, updates } })}
              onMatchStem={handleMatchStem}
              isUploading={state.isUploading}
            />
          )}

          {/* Upload Complete */}
          {state.uploadedFiles.filter(f => f.isComplete).length > 0 && !state.isUploading && (
            <div className="text-center py-8 bg-green-900/20 rounded-lg border border-green-500/30 mt-6">
              <Check size={48} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-white text-xl font-semibold mb-2">Upload Complete!</h3>
              <p className="text-gray-300 mb-4">
                Successfully uploaded {state.uploadedFiles.filter(f => f.isComplete).length} file(s).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900/50 rounded-b-xl">
          <button
            onClick={handleCloseModal}
            disabled={state.isUploading}
            className={`px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium ${
              state.isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Cancel
          </button>
          
          <div className="flex space-x-3">
            {!state.isUploading && state.uploadedFiles.length > 0 && (
              <button
                onClick={handleStartUpload}
                disabled={state.isUploading}
                className={`flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium ${
                  state.isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload size={20} className="mr-2" />
                Upload ({state.uploadedFiles.length})
              </button>
            )}
            
            <button
              onClick={handleComplete}
              disabled={!state.uploadedFiles.some(f => f.isComplete) || state.isUploading}
              className={`px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium ${
                !state.uploadedFiles.some(f => f.isComplete) || state.isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal; 