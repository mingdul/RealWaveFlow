import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Headphones,
  LogOut,
  Plus,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  Users,
} from 'lucide-react';
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

const DashboardPageV2 = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showError, showSuccess} = useToast();
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
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

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

      console.log('[DEBUG] Loading tracks with filter:', filter);

      let result;
      if (filter === 'owned') {
        result = await trackService.getUserTracks();
      } else {
        result = await trackService.getCollaboratorTracks();
      }
      console.log('[DEBUG] loadTracks response:', result);

      // 백엔드 응답 구조: { success: true, data: { tracks: Track[] } }
      if (result && result.success && result.data && result.data.tracks) {
        console.log('[DEBUG] Setting tracks:', result.data.tracks);
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
        console.log(
          '[DEBUG] DashboardPage - Track and stage created successfully:',
          {
            trackId: data.track.id,
            trackTitle: data.track.title,
            stageId: data.stage.id,
            stageTitle: data.stage.title,
          }
        );

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
        console.error(
          '[ERROR] DashboardPage - Missing track or stage data:',
          data
        );
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
    console.log(
      '[DEBUG] DashboardPage - Init project completed, refreshing dashboard'
    );
    handleCloseInitProjectModal();
    await loadTracks();
  };

  const ProjectCard = ({
    track,
    isNewProject = false,
  }: {
    track?: Track;
    isNewProject?: boolean;
  }) => {
    if (isNewProject) {
      return (
        <div
          onClick={handleNewProject}
          className='group flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-none bg-neutral-800 shadow-lg transition-all duration-300 hover:shadow-xl'
        >
          <div className='rounded-none bg-white p-6 transition-colors group-hover:bg-gray-100'>
            <Plus size={48} className='text-neutral-800' />
          </div>
          <h3 className='mt-4 text-xl font-semibold text-white'>New Track</h3>
        </div>
      );
    }

    if (!track) return null;

    return (
      <div
        onClick={() => handleTrackClick(track.id)}
        className='group cursor-pointer overflow-hidden  shadow-lg transition-all duration-300 hover:shadow-xl'
      >
        <div className='relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600'>
          {/* 기본 이미지 */}
          <div className='absolute inset-0 flex items-center justify-center'>
            <Headphones size={64} className='text-white opacity-60' />
          </div>

          {/* 실제 이미지 */}
          <PresignedImage
            trackId={track.id}
            imageUrl={track.image_url}
            alt={track.title}
            className='absolute inset-0 h-full w-full border-none object-cover'
          />

          {/* 호버 시 나타나는 정보 오버레이 */}
          <div className='absolute inset-0 flex items-start justify-start bg-black bg-opacity-80 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
            {/* 상단 오른쪽 편집/삭제 버튼 */}
            {filter === 'owned' && (
              <div className='absolute right-4 top-4 flex space-x-2'>
                <button
                  onClick={(e) => handleEditTrack(track, e)}
                  className='rounded-full bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700'
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => handleDeleteTrack(track.id, e)}
                  className='rounded-full bg-red-600 p-2 text-white transition-colors hover:bg-red-700'
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {/* 중앙 정보 */}
            <div className='m-auto px-4 text-center text-white'>
              <h2 className='mb-2 text-xl font-bold'>TITLE: {track.title}</h2>
              {track.genre && (
                <p className='mb-2 text-sm text-gray-300'>
                  GENRE: {track.genre}
                </p>
              )}
              {track.bpm && (
                <p className='mb-2 text-sm text-gray-300'>BPM: {track.bpm}</p>
              )}
              {track.key_signature && (
                <p className='mb-2 text-sm text-gray-300'>
                  KEY: {track.key_signature}
                </p>
              )}
              <p className='mb-2 text-xs text-gray-400'>
                Updated:{' '}
                {new Date(track.updated_date).toLocaleDateString('en-US')}
              </p>
              {track.collaborators && track.collaborators.length > 0 && (
                <div className='flex items-center justify-center'>
                  <Users size={14} className='mr-1 text-gray-400' />
                  <span className='text-sm text-gray-400'>
                    {track.collaborators.length} collaborators
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className='p-4'>
          <h3 className='mb-1 truncate text-lg font-semibold text-white'>
            {track.title}
          </h3>
          <p className='truncate text-sm text-gray-400'>
            {' '}
            Updated {new Date(track.updated_date).toLocaleDateString('en-US')}
          </p>
        </div>
      </div>
    );
  };

  const LoadingState = () => (
    <div className='flex items-center justify-center py-20'>
      <div className='text-center'>
        <Loader2 className='mx-auto mb-4 h-12 w-12 animate-spin text-purple-500' />
        <p className='text-gray-400'>Loading tracks...</p>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className='flex items-center justify-center py-20'>
      <div className='text-center'>
        <AlertCircle className='mx-auto mb-4 h-12 w-12 text-red-500' />
        <p className='mb-4 text-gray-400'>{error}</p>
        <Button
          onClick={loadTracks}
          className='bg-purple-600 hover:bg-purple-700'
        >
          Retry
        </Button>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className='flex items-center justify-center py-20'>
      <div className='text-center'>
        <Headphones className='mx-auto mb-4 h-16 w-16 text-gray-500' />
        <h3 className='mb-2 text-xl font-semibold text-white'>
          {filter === 'owned' ? 'No tracks created' : 'No collaborative tracks'}
        </h3>
        <p className='mb-6 text-gray-400'>
          {filter === 'owned'
            ? 'Start your first Track!'
            : 'Collaborate with other users to create Track!'}
        </p>
        {filter === 'owned' && (
          <Button
            onClick={handleNewProject}
            className='bg-purple-600 hover:bg-purple-700'
          >
            Start New Track
          </Button>
        )}
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <div className='flex h-screen items-center justify-center bg-gray-900'>
        <div className='text-center'>
          <Loader2 className='mx-auto mb-4 h-12 w-12 animate-spin text-purple-500' />
          <p className='text-gray-400'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // 리다이렉트 처리 중
  }

  return (
    <div
      className='relative min-h-screen bg-cover bg-center'
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      {/* 어두운 오버레이 */}
      <div className='absolute inset-0 h-screen bg-black bg-opacity-80 flex flex-col'>

        {/* Header */}
        <header className='flex flex-shrink-0 items-center justify-between border-b border-gray-800 p-6'>
          {/* <div className="flex items-center space-x-3">
          <div className="text-white text-2xl font-bold">Wave FLOW</div>
          <div className="flex space-x-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`w-1 bg-white rounded-full ${i % 2 === 0 ? 'h-6' : 'h-4'}`}></div>
            ))}
          </div>
        </div> */}
          <Logo />

          <div className='flex items-center space-x-4'>
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

            {/* Toast 테스트 버튼들 (개발 모드에서만 표시) */}
            {/* {import.meta.env.DEV && (
              <div className='flex items-center space-x-2'>
                <span className='text-xs text-gray-400'>Toast:</span>
                <div className='flex space-x-1'>
                  <button
                    onClick={() => showSuccess('✅ Track uploaded successfully!')}
                    className='px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition-colors'
                    title='Test Success Toast'
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => showError('❌ Failed to connect to server. Please try again.')}
                    className='px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors'
                    title='Test Error Toast'
                  >
                    ✗
                  </button>
                  <button
                    onClick={() => showWarning('⚠️ You have unsaved changes. Save before continuing?')}
                    className='px-2 py-1 text-xs bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30 transition-colors'
                    title='Test Warning Toast'
                  >
                    ⚠
                  </button>
                  <button
                    onClick={() => showInfo('💡 New collaboration features are now available!')}
                    className='px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors'
                    title='Test Info Toast'
                  >
                    ⓘ
                  </button>
                  <button
                    onClick={() => {
                      showSuccess('First success message');
                      setTimeout(() => showError('Second error message'), 500);
                      setTimeout(() => showWarning('Third warning message'), 1000);
                      setTimeout(() => showInfo('Fourth info message'), 1500);
                    }}
                    className='px-2 py-1 text-xs bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30 transition-colors'
                    title='Test Multiple Toasts'
                  >
                    🎭
                  </button>
                </div>
              </div>
            )} */}

            <button
              onClick={handleLogout}
              className='flex items-center space-x-2 rounded-full bg-purple-500 px-6 py-2 text-white transition-all duration-300 hover:from-pink-500 hover:to-purple-600'
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className='mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-6 scrollbar-hide'>
          {/* Greeting */}
          <div className='mb-12 mt-8'>
            <h1 className='mb-2 bg-gradient-to-r from-[#FF4E4E] to-[#2159C6] bg-clip-text text-5xl font-bold text-transparent'>
              Hello, {user.username}!
            </h1>
            <p className='text-lg text-gray-400'>Creativity lives here</p>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-row gap-4 justify-between">
            <div className="flex gap-4">
              <p className="text-white text-2xl">TRACKS</p>
            </div>
            {/* Filter Buttons */}
            <div className="flex space-x-4 mb-8">
              <Button
                onClick={() => setFilter('owned')}
                variant='waveflowbtn'
                className="flex items-center space-x-2"
              >
                <span>OWNED</span>
              </Button>
              <Button
                onClick={() => setFilter('collaborated')}
                variant='waveflowbtn'
                className="flex items-center space-x-2"
              >
                <span>COLLABORATED</span>
              </Button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState />
          ) : tracks.length === 0 ? (
            <EmptyState />
          ) : (
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
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
    </div>
  );
};

// Edit Track Modal Component
const EditTrackModal = ({
  track,
  onClose,
  onSubmit,
}: {
  track: Track;
  onClose: () => void;
  onSubmit: (trackId: string, data: any) => void;
}) => {
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
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='w-full max-w-md rounded-lg bg-gray-800 p-6'>
        <h2 className='mb-4 text-xl font-bold text-white'>Edit Track</h2>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm text-gray-300'>
              Track Name
            </label>
            <input
              type='text'
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className='w-full rounded bg-gray-700 px-3 py-2 text-white'
              required
            />
          </div>
          <div>
            <label className='mb-2 block text-sm text-gray-300'>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className='w-full rounded bg-gray-700 px-3 py-2 text-white'
              rows={3}
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='mb-2 block text-sm text-gray-300'>Genre</label>
              <input
                type='text'
                value={formData.genre}
                onChange={(e) =>
                  setFormData({ ...formData, genre: e.target.value })
                }
                className='w-full rounded bg-gray-700 px-3 py-2 text-white'
              />
            </div>
            <div>
              <label className='mb-2 block text-sm text-gray-300'>BPM</label>
              <input
                type='text'
                value={formData.bpm}
                onChange={(e) =>
                  setFormData({ ...formData, bpm: e.target.value })
                }
                className='w-full rounded bg-gray-700 px-3 py-2 text-white'
              />
            </div>
          </div>
          <div>
            <label className='mb-2 block text-sm text-gray-300'>
              Key Signature
            </label>
            <input
              type='text'
              value={formData.key_signature}
              onChange={(e) =>
                setFormData({ ...formData, key_signature: e.target.value })
              }
              className='w-full rounded bg-gray-700 px-3 py-2 text-white'
            />
          </div>
          <div className='flex space-x-3 pt-4'>
            <Button
              type='submit'
              className='flex-1 bg-purple-600 hover:bg-purple-700'
            >
              Update
            </Button>
            <Button
              type='button'
              onClick={onClose}
              variant='secondary'
              className='flex-1'
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DashboardPageV2;