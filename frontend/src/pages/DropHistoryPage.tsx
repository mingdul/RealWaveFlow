import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, User, ArrowLeft, MessageCircle } from 'lucide-react';
import Logo from '../components/Logo';
import DropService from '../services/dropService';
import { useToast } from '../contexts/ToastContext';

interface Drop {
  id: string;
  description: string;
  created_at: string;
  status: string;
  drop_by: {
    id: string;
    username: string;
    email: string;
  };
  track: {
    id: string;
    name: string;
    description: string;
    genre: string;
    bpm: string;
    key_signature: string;
  };
}

interface Track {
  id: string;
  name: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const DropHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();
  
  const [drops, setDrops] = useState<Drop[]>([]);
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    console.log('=== DropHistoryPage useEffect triggered ===');
    console.log('URL param id:', id);
    
    const fetchDropHistory = async () => {
      if (!id) {
        console.warn('No trackId found in URL params');
        return;
      }
      
      try {
        console.log('=== Starting Drop History API Call ===');
        console.log('Fetching drops for trackId:', id);
        
        setLoading(true);
        setError(null);
        
        const response = await DropService.getDropsByTrackId(id);
        console.log('=== API Response received ===');
        console.log('Raw response:', response);
        console.log('Response success:', response.success);
        console.log('Response data:', response.data);
        
        if (response.success) {
          const drops = response.data || [];
          const track = drops.length > 0 ? drops[0].track : { id, name: 'Unknown Track' };
          
          console.log('=== Processing successful response ===');
          console.log('Drops count:', drops.length);
          console.log('Drops data:', drops);
          console.log('Track info:', track);
          
          setDrops(drops);
          setTrack(track);
        } else {
          console.error('=== API returned unsuccessful response ===');
          console.error('Response message:', response.message);
          setError('Drop 히스토리를 불러오는데 실패했습니다.');
        }
      } catch (err) {
        console.error('=== API Call Error ===');
        console.error('Error details:', err);
        console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');
        setError('Drop 히스토리를 불러오는데 실패했습니다.');
        showError('Drop 히스토리를 불러오는데 실패했습니다.');
      } finally {
        console.log('=== API Call completed ===');
        setLoading(false);
      }
    };

    fetchDropHistory();
  }, [id, showError]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기 중';
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '거부됨';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600';
      case 'approved':
        return 'bg-green-600';
      case 'rejected':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getCardStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-gray-700 bg-gray-900 hover:border-blue-500 hover:bg-gray-800';
      case 'approved':
        return 'border-green-600 bg-green-900/20 hover:border-green-500 hover:bg-green-900/30';
      case 'rejected':
        return 'border-red-600 bg-red-900/20 hover:border-red-500 hover:bg-red-900/30';
      default:
        return 'border-gray-700 bg-gray-900 hover:border-blue-500 hover:bg-gray-800';
    }
  };

  const getFilteredDrops = () => {
    if (activeFilter === 'all') {
      return drops;
    }
    return drops.filter(drop => drop.status === activeFilter);
  };

  const getFilterButtonStyle = (filter: FilterStatus) => {
    const baseStyle = 'px-4 py-2 rounded-lg font-medium transition-all duration-200';
    if (activeFilter === filter) {
      switch (filter) {
        case 'all':
          return `${baseStyle} bg-blue-600 text-white`;
        case 'pending':
          return `${baseStyle} bg-yellow-600 text-white`;
        case 'approved':
          return `${baseStyle} bg-green-600 text-white`;
        case 'rejected':
          return `${baseStyle} bg-red-600 text-white`;
        default:
          return `${baseStyle} bg-blue-600 text-white`;
      }
    } else {
      return `${baseStyle} bg-gray-700 text-gray-300 hover:bg-gray-600`;
    }
  };

  const getFilterCount = (filter: FilterStatus) => {
    if (filter === 'all') {
      return drops.length;
    }
    return drops.filter(drop => drop.status === filter).length;
  };

  const handleDropClick = (dropId: string) => {
    console.log('=== Drop Card Clicked ===');
    console.log('dropId:', dropId);
    const targetRoute = `/drop-review?trackId=${id}&dropId=${dropId}`;
    console.log('Navigating to:', targetRoute);
    navigate(targetRoute);
  };

  const handleBackClick = () => {
    console.log('=== Back Button Clicked ===');
    console.log('trackId:', id);
    const targetRoute = `/master?trackId=${id}`;
    console.log('Navigating back to:', targetRoute);
    navigate(targetRoute);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg">Drop 히스토리를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mb-4 text-red-500 text-6xl">⚠️</div>
          <p className="text-lg text-red-400 mb-4">{error}</p>
          <button
            onClick={handleBackClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  const filteredDrops = getFilteredDrops();

  return (
    <div className="flex h-screen w-full flex-col bg-black text-white">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-800 bg-black">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Logo />
            <button
              onClick={handleBackClick}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>뒤로 가기</span>
            </button>
            <div className="h-6 w-px bg-gray-700"></div>
            <h1 className="text-xl font-bold text-white">
              {track?.name || 'Track'} - Drop History
            </h1>
          </div>
        </div>
      </header>

      {/* Filter Buttons */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-black px-6 py-4">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-400">상태별 필터:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={getFilterButtonStyle('all')}
            >
              전체 ({getFilterCount('all')})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={getFilterButtonStyle('pending')}
            >
              대기 중 ({getFilterCount('pending')})
            </button>
            <button
              onClick={() => setActiveFilter('approved')}
              className={getFilterButtonStyle('approved')}
            >
              승인됨 ({getFilterCount('approved')})
            </button>
            <button
              onClick={() => setActiveFilter('rejected')}
              className={getFilterButtonStyle('rejected')}
            >
              거부됨 ({getFilterCount('rejected')})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {filteredDrops.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-400 mb-2">
                {activeFilter === 'all' ? 'Drop 히스토리가 없습니다' : `${getStatusText(activeFilter)} Drop이 없습니다`}
              </h2>
              <p className="text-gray-500">
                {activeFilter === 'all' ? '아직 생성된 Drop이 없습니다.' : `선택한 상태의 Drop이 없습니다.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDrops.map((drop) => (
                <div
                  key={drop.id}
                  onClick={() => handleDropClick(drop.id)}
                  className={`group cursor-pointer rounded-lg border p-6 transition-all ${getCardStyle(drop.status)}`}
                >
                  {/* Drop Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        drop.status === 'approved' ? 'bg-green-600' : 
                        drop.status === 'rejected' ? 'bg-red-600' : 'bg-blue-600'
                      }`}>
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {drop.drop_by.username}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(drop.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(drop.status)}`}>
                        {getStatusText(drop.status)}
                      </span>
                    </div>
                  </div>

                  {/* Drop Message */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Drop 메시지
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {drop.description}
                    </p>
                  </div>

                  {/* Drop Details */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">
                      Drop 정보
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">작성자:</span>{' '}
                        <span className="text-gray-300">{drop.drop_by.username}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">상태:</span>{' '}
                        <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(drop.status)}`}>
                          {getStatusText(drop.status)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">이메일:</span>{' '}
                        <span className="text-gray-300">{drop.drop_by.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">트랙:</span>{' '}
                        <span className="text-gray-300">{drop.track.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className={`text-sm ${
                      drop.status === 'approved' ? 'text-green-400' : 
                      drop.status === 'rejected' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      클릭하여 Drop 상세 페이지로 이동 →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DropHistoryPage; 