import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Upload} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import trackService from '../services/trackService';
import { Track } from '../types/api';



interface SidebarInfoProps {
    trackId?: string;
}

const SidebarInfo: React.FC<SidebarInfoProps> = ( ) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const navigate = useNavigate();
    const [track, setTrack] = useState<Track | null>(null);
    const [loading, setLoading] = useState(true);
    const trackId  = new URLSearchParams(window.location.search).get('trackId');
    // ADD FILE 버튼 클릭 핸들러
    
    useEffect(() => {
        const fetchTrack = async () => {
            if (!trackId) return;
            try {
                const res = await trackService.getTrackById(trackId);
                setTrack(res.data ?? null);
            } catch (err) {
                console.error('[SidebarInfo] 트랙 정보를 불러오는 데 실패했습니다.', err);
            } finally {
                setLoading(false);
            }
        }
        fetchTrack();
    }, [trackId]);
    
    if (loading) return <div className="text-white p-4">로딩 중...</div>;

    if (!track) return <div className="text-white p-4">트랙 정보를 찾을 수 없습니다.</div>;


    const handleAddFile = () => {
        if (trackId) {
            navigate(`/commit?projectId=${trackId}`);
        } else {
            // trackId가 없는 경우 대시보드로 이동
            navigate('/dashboard');
        }
    };

    return (
        <div className="sidebar">
            {/* Project Info */}
            <div className="project-info">
                <h1 className="project-title">{track.title}</h1>

                <div className="info-section">
                    <div>
                        <h3 className="info-label">About</h3>
                        <div className="info-value">
                            <div className="text-sm">
                                <span className="text-gray-400">Created Data</span>
                                <div className="text-white">{track.created_date}</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <span className="owner-label">Owner</span>
                        <div className="owner-value">{track.owner_id.username}</div>
                    </div>
q
                    <div>
                        <span className="comment-label">comment</span>
                        <div className="comment-value">
                            {track.description}
                        </div>
                    </div>
                </div>
            </div>

            {/* Guide Controls */}
            <div className="guide-section">
                <h3 className="guide-title">GUIDE</h3>
                <div className="guide-controls">
                    <button className="control-btn">
                        <SkipBack size={20} />
                    </button>
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="play-btn"
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>
                    <button className="control-btn">
                        <SkipForward size={20} />
                    </button>
                </div>
            </div>

            {/* Layer and Drop Request */}
            <div className="layer-section">
                {/* <button className="pr-btn">
                    <Upload size={20} />
                    <span>PR</span>
                </button> */}

                <button 
                    className="add-file-btn"
                    onClick={handleAddFile}
                >
                    <Upload size={20} />
                    <span>ADD FILE</span>
                </button>
            </div>
        </div>
    );
};

export default SidebarInfo;
