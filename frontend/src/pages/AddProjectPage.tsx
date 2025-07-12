import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Logo } from '../components';
import trackService from '../services/trackService';
import { CreateTrackDto } from '../types/api';

// Types for project data and stem files
interface ProjectData {
  title: string;
  description: string;
  genre: string;
  bpm: number | null;
  key_signature: string;
  time_signature: string;
  collaborators: string[];
}



interface ProjectInfoStepProps {
  projectData: ProjectData;
  onDataChange: (field: keyof ProjectData, value: any) => void;
  onNext: () => void;
}

const ProjectInfoStep: React.FC<ProjectInfoStepProps> = ({ projectData, onDataChange, onNext }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectData.title.trim()) {
      onNext();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">새 프로젝트 만들기</h1>
        <p className="text-gray-400">프로젝트 정보를 입력하고 협업자를 초대하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 기본 정보 */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">기본 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                프로젝트 제목 *
              </label>
              <input
                type="text"
                value={projectData.title}
                onChange={(e) => onDataChange('title', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="프로젝트 제목을 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                장르
              </label>
              <select
                value={projectData.genre}
                onChange={(e) => onDataChange('genre', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">장르 선택</option>
                <option value="pop">Pop</option>
                <option value="rock">Rock</option>
                <option value="hip-hop">Hip-Hop</option>
                <option value="electronic">Electronic</option>
                <option value="jazz">Jazz</option>
                <option value="classical">Classical</option>
                <option value="r&b">R&B</option>
                <option value="country">Country</option>
                <option value="indie">Indie</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                BPM
              </label>
              <input
                type="number"
                value={projectData.bpm || ''}
                onChange={(e) => onDataChange('bpm', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="120"
                min="60"
                max="200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                키 시그니처
              </label>
              <select
                value={projectData.key_signature}
                onChange={(e) => onDataChange('key_signature', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">키 선택</option>
                <option value="C">C Major</option>
                <option value="G">G Major</option>
                <option value="D">D Major</option>
                <option value="A">A Major</option>
                <option value="E">E Major</option>
                <option value="B">B Major</option>
                <option value="F#">F# Major</option>
                <option value="C#">C# Major</option>
                <option value="F">F Major</option>
                <option value="Bb">Bb Major</option>
                <option value="Eb">Eb Major</option>
                <option value="Ab">Ab Major</option>
                <option value="Db">Db Major</option>
                <option value="Gb">Gb Major</option>
                <option value="Cb">Cb Major</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                박자
              </label>
              <select
                value={projectData.time_signature}
                onChange={(e) => onDataChange('time_signature', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">박자 선택</option>
                <option value="4/4">4/4</option>
                <option value="3/4">3/4</option>
                <option value="2/4">2/4</option>
                <option value="6/8">6/8</option>
                <option value="12/8">12/8</option>
                <option value="5/4">5/4</option>
                <option value="7/8">7/8</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              프로젝트 설명
            </label>
            <textarea
              value={projectData.description}
              onChange={(e) => onDataChange('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="프로젝트에 대한 설명을 입력하세요..."
            />
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
          >
            <span>프로젝트 생성</span>
            <Check className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

const AddProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData>({
    title: '',
    description: '',
    genre: '',
    bpm: null,
    key_signature: '',
    time_signature: '4/4',
    collaborators: []
  });
  // 스템 파일 관련 상태는 현재 사용하지 않음
  // const [stemFiles, setStemFiles] = useState<StemFileType[]>([]);

  // 인증 확인
  // React.useEffect(() => {
  //   if (!isAuthenticated) {
  //     navigate('/login');
  //   }
  // }, [isAuthenticated, navigate]);

  const handleDataChange = (field: keyof ProjectData, value: any) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateProject = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const createTrackDto: CreateTrackDto = {
        name: projectData.title,
        description: projectData.description || undefined,
        genre: projectData.genre || undefined,
        bpm: projectData.bpm?.toString() || undefined,
        key_signature: projectData.key_signature || undefined,
        owner_id: user.id
      };

      const response = await trackService.createTrack(createTrackDto);
      
      if (response.success && response.data) {
        showSuccess('프로젝트가 성공적으로 생성되었습니다!');
        // 첫 번째 음악 파일을 업로드하기 위해 InitProjectPage로 이동
        const params = new URLSearchParams({
          projectId: response.data.id,
          projectName: projectData.title,
          projectDescription: projectData.description || ''
        });
        navigate(`/init-project?${params.toString()}`);
      } else {
        throw new Error(response.message || '프로젝트 생성에 실패했습니다.');
      }
    } catch (error: any) {
      showError(error.message || '프로젝트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null; // 리다이렉트 처리 중
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <Logo size="sm" />
          </div>
          
          <div className="text-sm text-gray-400">
            {user.username}님의 새 프로젝트
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">프로젝트를 생성하는 중...</p>
            </div>
          </div>
        ) : (
          <ProjectInfoStep
            projectData={projectData}
            onDataChange={handleDataChange}
            onNext={handleCreateProject}
          />
        )}
      </main>
    </div>
  );
};



export default AddProjectPage;