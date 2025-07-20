import React, { useState } from 'react';
import { X, Upload, Loader2} from 'lucide-react';
// import Button from './Button';
import StepProgress from './StepProgress';
import s3UploadService from '../services/s3UploadService';
import stemJobService from '../services/stemJobService';
import { useToast } from '../contexts/ToastContext';
import { getRandomDefaultImageUrl } from '../utils/imageUtils';
import AnimatedModal from './AnimatedModal';

interface CreateTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const CreateTrackModal: React.FC<CreateTrackModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { showError, showSuccess } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    genre: '',
    bpm: '',
    key_signature: '',
    // stage_title and stage_description removed
  });
  
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  const steps = ['Create Track', 'Upload Files'];
  // Dropdown option lists
  const genresList: string[] = ['Hip-hop', 'Pop', 'R&B', 'Rock', 'Jazz', 'Classical', 'Electronic', 'Country', 'Reggae', 'Other'];
  const keySignatureList: string[] = [
    'C Major', 'C Minor', 'C# Major', 'C# Minor', 'D Major', 'D Minor', 'D# Major', 'D# Minor',
    'E Major', 'E Minor', 'F Major', 'F Minor', 'F# Major', 'F# Minor', 'G Major', 'G Minor',
    'G# Major', 'G# Minor', 'A Major', 'A Minor', 'A# Major', 'A# Minor', 'B Major', 'B Minor'
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file && !file.type.startsWith('image/')) {
      showError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[DEBUG] CreateTrackModal - Form submitted with data:', formData);
    setIsSubmitting(true);
    setImageUploadProgress(0);

    try {
      let imageKey = '';
      
      // 1. 이미지 업로드 (선택사항)
      if (coverImage) {
        console.log('[DEBUG] CreateTrackModal - Starting image upload:', coverImage.name);
        try {
          const { key } = await s3UploadService.uploadImage(
            coverImage,
            (progress) => {
              console.log('[DEBUG] CreateTrackModal - Image upload progress:', progress);
              setImageUploadProgress(progress);
            }
          );
          imageKey = key;
          console.log('[DEBUG] CreateTrackModal - Image uploaded successfully:', key);
        } catch (error: any) {
          console.error('[ERROR] CreateTrackModal - Image upload failed:', error);
          showError(`이미지 업로드 실패: ${error.message}`);
          return;
        }
      } else {
        // 이미지를 업로드하지 않은 경우 기본 이미지 랜덤 선택
        imageKey = getRandomDefaultImageUrl();
        console.log('[DEBUG] CreateTrackModal - Using default image:', imageKey);
      }

      // 2. stem-job/init-start API 호출
      const initStartRequest = {
        title: formData.name,
        description: formData.description,
        genre: formData.genre,
        bpm: formData.bpm,
        key_signature: formData.key_signature,
        image_url: imageKey,
        stage_title: 'first stage',
        stage_description: 'start your track in first stage',
      };

      console.log('[DEBUG] CreateTrackModal - Calling stem-job/init-start with:', initStartRequest);
      const result = await stemJobService.initStart(initStartRequest);
      console.log('[DEBUG] CreateTrackModal - stem-job/init-start response:', result);
      
      if (result.success && result.data) {
        console.log('[DEBUG] CreateTrackModal - Track and stage created successfully:', result.data);
        showSuccess('Track and stage created successfully!');
        onSubmit({
          track: result.data.track,
          stage: result.data.stage,
        });
      } else {
        console.error('[ERROR] CreateTrackModal - Failed to create track and stage:', result);
        showError('Failed to create track and stage');
      }
    } catch (error: any) {
      console.error('[ERROR] CreateTrackModal - Track creation error:', error);
      showError(error.message || 'Failed to create track');
    } finally {
      setIsSubmitting(false);
      setImageUploadProgress(0);
    }
  };

  const handleCloseModal = () => {
    onClose();
  };

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      animationType="scale"
      className="bg-gray-800 rounded-xl w-full max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
    >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Create New Track</h2>
            <p className="text-gray-400 text-sm mt-1">Set up your track information</p>
          </div>
          <button 
            onClick={handleCloseModal}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-4 sm:space-y-6">
          <StepProgress currentStep={1} steps={steps} />
          
          <div className="max-h-[calc(90vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Track Info */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
                    Track Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Track Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Enter track name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                        placeholder="Describe your track"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">Genre</label>
                        <select
                          value={formData.genre}
                          onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        >
                          <option value="">Select genre</option>
                          {genresList.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">BPM</label>
                        <input
                          type="text"
                          value={formData.bpm}
                          onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          placeholder="e.g. 120"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Key Signature</label>
                      <select
                        value={formData.key_signature}
                        onChange={(e) => setFormData({ ...formData, key_signature: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select key signature</option>
                        {keySignatureList.map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                
                  {/* <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
                    Initial Stage Setup
                  </h3> */}
                  {/* Removed stage title and description input fields */}
                
              </div>

              {/* Right Column - Cover Image */}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Cover Image (Optional)</label>
                  <p className="text-gray-400 text-xs mb-4">Upload a cover image for your track</p>
                  
                  {!coverImagePreview ? (
                    <div className="relative">
                      <input
                        type="file"
                        id="cover-image-input"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor="cover-image-input"
                        className={`block w-full aspect-square border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/10 transition-all duration-200 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <Upload size={32} className="text-gray-400 mb-3" />
                          <p className="text-gray-400 text-sm font-medium">Click to upload cover image</p>
                          <p className="text-gray-500 text-xs mt-1">PNG, JPG, JPEG up to 10MB</p>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={coverImagePreview}
                        alt="Cover preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {!isSubmitting && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                        {coverImage?.name}
                      </div>
                      {isSubmitting && imageUploadProgress > 0 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="text-center">
                            <div className="text-white text-sm mb-2">Uploading image...</div>
                            <div className="w-32 bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${imageUploadProgress}%` }}
                              />
                            </div>
                            <div className="text-white text-xs mt-1">{imageUploadProgress}%</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Preview Card */}
                {/* <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white text-sm font-medium mb-2">Preview</h4>
                  <div className="bg-gray-600 rounded-lg p-3 flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center overflow-hidden">
                      {coverImagePreview ? (
                        <img src={coverImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Image size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {formData.name || 'Track Name'}
                      </p>
                      <p className="text-gray-400 text-xs truncate">
                        {formData.genre || 'Genre'} {formData.bpm && `• ${formData.bpm} BPM`}
                      </p>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900/50 rounded-b-xl">
          <button 
            onClick={handleCloseModal}
            disabled={isSubmitting}
            className={`px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || isSubmitting}
            className={`px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center space-x-2 ${!formData.name.trim() || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            <span>{isSubmitting ? 'Creating...' : 'Next Step'}</span>
          </button>
        </div>
    </AnimatedModal>
  );
};

export default CreateTrackModal; 