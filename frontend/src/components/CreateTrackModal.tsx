import React, { useState } from 'react';
import { X, Upload} from 'lucide-react';
// import Button from './Button';
import StepProgress from './StepProgress';

interface CreateTrackModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const CreateTrackModal: React.FC<CreateTrackModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    genre: '',
    bpm: '',
    key_signature: '',
  });
  
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const steps = ['Create Track', 'Upload Files'];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, coverImage });
  };

  const handleCloseModal = () => {
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={handleCloseModal}
    >
      <div 
        className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Create New Track</h2>
            <p className="text-gray-400 text-sm mt-1">Set up your track information</p>
          </div>
          <button 
            onClick={handleCloseModal}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <StepProgress currentStep={1} steps={steps} />
          
          <div className="max-h-[60vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-6">Track Information</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Track Info */}
              <div className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
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
                      <input
                        type="text"
                        value={formData.genre}
                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="e.g. Hip-hop, Pop"
                      />
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
                    <input
                      type="text"
                      value={formData.key_signature}
                      onChange={(e) => setFormData({ ...formData, key_signature: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="e.g. C major, A minor"
                    />
                  </div>
                </form>
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
                      />
                      <label
                        htmlFor="cover-image-input"
                        className="block w-full h-48 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/10 transition-all duration-200"
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
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                        {coverImage?.name}
                      </div>
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
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.name.trim()}
            className={`px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium ${!formData.name.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTrackModal; 