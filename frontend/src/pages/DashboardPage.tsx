import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, LogOut, Plus, Loader2, AlertCircle, Edit, Trash2, Users} from 'lucide-react';
// import { Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
// import { useSocket } from '../contexts/SocketContext';
import Button from '../components/Button';
import trackService from '../services/trackService';
import { Track } from '../types/api';
import Logo from '../components/Logo';
import InitProjectModal from '../components/InitProjectModal';
import CreateTrackModal from '../components/CreateTrackModal';
import PresignedImage from '../components/PresignedImage';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { showError, showSuccess } = useToast();
  // const { isConnected, onlineUsers, sendMessage, ping } = useSocket();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'owned' | 'collaborated'>('owned');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [initProjectModal, setInitProjectModal] = useState<{
    isOpen: boolean;
    projectId: string;
    projectName: string;
    projectDescription: string;
    stageId?: string;
  }>({
    isOpen: false,
    projectId: '',
    projectName: '',
    projectDescription: '',
    stageId: undefined,
  });
  // const [testMessage, setTestMessage] = useState('');


  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // 트랙 목록 로드
  useEffect(() => {
    if (isAuthenticated) {
      loadTracks();
    }
  }, [isAuthenticated, filter]);

  const loadTracks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let result;
      if (filter === 'owned') {
        result = await trackService.getUserTracks();
      } else {
        result = await trackService.getCollaboratorTracks();
      }
      console.log('[DEBUG] loadTracks response:', result);
      
      // 백엔드 응답 구조: { success: true, data: { tracks: Track[] } }
      if (result && result.success && result.data && result.data.tracks) {
        setTracks(result.data.tracks);
      } else {
        console.error('[DEBUG] Unexpected response structure:', result);
        setError('Unable to load track list.');
      }
    } catch (error: any) {
      console.error('[DEBUG] loadTracks error:', error);
      setError(error.message || 'An error occurred while loading tracks.');
      showError(error.message || 'An error occurred while loading tracks.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleNewProject = () => {
    setIsCreating(true);
  };

  const handleTrackClick = (trackId: string) => {
    navigate(`/track/${trackId}`);
  };

  const handleEditTrack = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrack(track);
  };

  const handleDeleteTrack = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this track?')) {
      try {
        await trackService.deleteTrack(trackId);
        showSuccess('Track deleted successfully.');
        loadTracks();
      } catch (error: any) {
        showError(error.message || 'Failed to delete track.');
      }
    }
  };

  const handleCreateTrack = async (data: any) => {
    try {
      console.log('[DEBUG] DashboardPage - Creating track with data:', data);
      
      // CreateTrackModal에서 이미 stem-job/init-start를 호출했으므로
      // 여기서는 결과를 받아서 InitProjectModal을 띄우기만 하면 됨
      if (data.track && data.stage) {
        console.log('[DEBUG] DashboardPage - Track and stage created successfully:', {
          trackId: data.track.id,
          trackTitle: data.track.title,
          stageId: data.stage.id,
          stageTitle: data.stage.title
        });
        
        showSuccess('New track created successfully.');
        setIsCreating(false);
        
        // 첫 번째 음악 파일을 업로드하기 위해 InitProjectModal 띄우기
        setInitProjectModal({
          isOpen: true,
          projectId: data.track.id,
          projectName: data.track.title,
          projectDescription: data.track.description || '',
          stageId: data.stage.id,
        });
      } else {
        console.error('[ERROR] DashboardPage - Missing track or stage data:', data);
        showError('Failed to create track and stage');
      }
    } catch (error: any) {
      console.error('[ERROR] DashboardPage - Track creation error:', error);
      showError(error.message || 'Failed to create track.');
    }
  };

  const handleUpdateTrack = async (trackId: string, trackData: any) => {
    try {
      await trackService.updateTrack(trackId, trackData);
      showSuccess('Track updated successfully.');
      setEditingTrack(null);
      loadTracks();
    } catch (error: any) {
      showError(error.message || 'Failed to update track.');
    }
  };

  const handleCloseInitProjectModal = () => {
    setInitProjectModal({
      isOpen: false,
      projectId: '',
      projectName: '',
      projectDescription: '',
      stageId: undefined,
    });
  };

  const handleCompleteInitProject = async () => {
    console.log('[DEBUG] DashboardPage - Init project completed, refreshing dashboard');
    handleCloseInitProjectModal();
    await loadTracks();
  };

  const ProjectCard = ({ track, isNewProject = false }: { track?: Track, isNewProject?: boolean }) => {
    if (isNewProject) {
      return (
        <div 
          onClick={handleNewProject}
          className="bg-neutral-800 rounded-xl p-8 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
        >
          <div className="flex flex-col items-center justify-center h-48">
            <div className="bg-white rounded-full p-6 mb-4 group-hover:bg-gray-100 transition-colors">
              <Plus size={48} className="text-neutral-800" />
            </div>
            <h3 className="text-white text-xl font-semibold">New Track</h3>
            <p className="text-gray-400 text-sm mt-2">Start a new Track</p>
          </div>
        </div>
      );
    }

    if (!track) return null;

    return (
      <div 
        onClick={() => handleTrackClick(track.id)}
        className="bg-neutral-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer relative group"
      >
        <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center relative">
          <Headphones size={64} className="text-white opacity-60" />
          <PresignedImage
            trackId={track.id}
            alt={track.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        
        {/* 편집/삭제 버튼 */}
        {filter === 'owned' && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-2">
              <button
                onClick={(e) => handleEditTrack(track, e)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={(e) => handleDeleteTrack(track.id, e)}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
        <div className="p-4">
          <h3 className="text-white text-lg font-semibold mb-1 truncate">{track.title}</h3>
          <p className="text-gray-400 text-sm mb-2">{track.genre || 'Genre not specified'}</p>
          <p className="text-gray-500 text-xs">
            Updated {new Date(track.updated_date).toLocaleDateString('en-US')}
          </p>
          {track.collaborators && track.collaborators.length > 0 && (
            <div className="flex items-center mt-2">
              <Users size={12} className="text-gray-400 mr-1" />
              <span className="text-xs text-gray-400">
                {track.collaborators.length} collaborators
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const LoadingState = () => (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
        <p className="text-gray-400">Loading tracks...</p>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">{error}</p>
        <Button onClick={loadTracks} className="bg-purple-600 hover:bg-purple-700">
          Retry
        </Button>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Headphones className="h-16 w-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          {filter === 'owned' ? 'No tracks created' : 'No collaborative tracks'}
        </h3>
        <p className="text-gray-400 mb-6">
          {filter === 'owned' 
            ? 'Start your first Track!' 
            : 'Collaborate with other users to create Track!'
          }
        </p>
        {filter === 'owned' && (
          <Button onClick={handleNewProject} className="bg-purple-600 hover:bg-purple-700">
            Start New Track
          </Button>
        )}
      </div>
    </div>
  );

  if (!isAuthenticated || !user) {
    return null; // 리다이렉트 처리 중
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 flex justify-between items-center p-6 border-b border-gray-800">
        {/* <div className="flex items-center space-x-3">
          <div className="text-white text-2xl font-bold">Wave FLOW</div>
          <div className="flex space-x-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`w-1 bg-white rounded-full ${i % 2 === 0 ? 'h-6' : 'h-4'}`}></div>
            ))}
          </div>
        </div> */}
        <Logo/>
        
        <div className="flex items-center space-x-4">
          {/* 소켓 연결 상태 표시 */}
          {/* <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center space-x-1 text-green-400">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">Connected in real-time</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-400">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-xs">Disconnected</span>
                </div>
              )}
              {onlineUsers > 0 && (
                <span className="text-xs text-gray-400">
                  Online: {onlineUsers}
                </span>
              )}
            </div>
            
           
            {isConnected && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={ping}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                >
                  Ping Test
                </button>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Test message"
                  className="bg-gray-700 text-white px-2 py-1 rounded text-xs w-32"
                />
                <button
                  onClick={() => {
                    if (testMessage.trim()) {
                      sendMessage(testMessage);
                      setTestMessage('');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                >
                  Send
                </button>
              </div>
            )}
          </div> */}
          
          
          <button 
            onClick={handleLogout}
            className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-2 rounded-full hover:from-pink-500 hover:to-purple-600 transition-all duration-300 flex items-center space-x-2"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-hide p-6 max-w-7xl mx-auto w-full">
        {/* Greeting */}
        <div className="mb-12 mt-8">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#FF4E4E] to-[#2159C6] mb-2">
            Hello, {user.username}!
          </h1>
          <p className="text-gray-400 text-lg">Creativity lives here</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-4 mb-8">
          <Button 
            onClick={() => setFilter('owned')}
            variant={filter === 'owned' ? 'primary' : 'secondary'}
            className="flex items-center space-x-2"
          >
            <span>My Tracks</span>
          </Button>
          <Button 
            onClick={() => setFilter('collaborated')}
            variant={filter === 'collaborated' ? 'primary' : 'secondary'}
            className="flex items-center space-x-2"
          >
            <Users size={16} />
            <span>Collaborative Tracks</span>
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : tracks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filter === 'owned' && <ProjectCard isNewProject />}
            {tracks.map((track) => (
              <ProjectCard key={track.id} track={track} />
            ))}
          </div>
        )}
      </main>

      {/* Create Track Modal */}
      {isCreating && (
        <CreateTrackModal 
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreateTrack}
        />
      )}

      {/* Edit Track Modal */}
      {editingTrack && (
        <EditTrackModal 
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
          onSubmit={handleUpdateTrack}
        />
      )}

      {/* Init Project Modal */}
      <InitProjectModal 
        isOpen={initProjectModal.isOpen}
        onClose={handleCloseInitProjectModal}
        projectId={initProjectModal.projectId}
        projectName={initProjectModal.projectName}
        projectDescription={initProjectModal.projectDescription}
        stageId={initProjectModal.stageId}
        onComplete={handleCompleteInitProject}
      />
    </div>
  );
};

// Edit Track Modal Component
const EditTrackModal = ({ track, onClose, onSubmit }: { track: Track, onClose: () => void, onSubmit: (trackId: string, data: any) => void }) => {
  const [formData, setFormData] = useState({
    title: track.title,
    description: track.description || '',
    genre: track.genre || '',
    bpm: track.bpm || '',
    key_signature: track.key_signature || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(track.id, formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Edit Track</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-2">Track Name</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
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
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-2">BPM</label>
              <input
                type="text"
                value={formData.bpm}
                onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-2">Key Signature</label>
            <input
              type="text"
              value={formData.key_signature}
              onChange={(e) => setFormData({ ...formData, key_signature: e.target.value })}
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
              Update
            </Button>
            <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DashboardPage;