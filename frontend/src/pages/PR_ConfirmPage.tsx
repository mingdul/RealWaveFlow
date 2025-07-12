import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  MessageCircle,
  CheckCircle,
  XCircle,
  Plus,
  Headphones,
} from 'lucide-react';
import styled from 'styled-components';
import WaveSurfer from 'wavesurfer.js';
import Logo from '../components/Logo.tsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import DropService from '../services/dropService';
import MasterStemService from '../services/masterStemService.ts';
import DropReviewerService from '../services/dropReviewerService.ts';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Stem {
  id: string;
  name: string;
  audioUrl: string;
  peaksUrl?: string;
  color: string;
  status: 'unchanged' | 'modified' | 'added' | 'removed';
  isMuted: boolean;
  volume: number;
  isPlaying: boolean;
}

interface Comment {
  id: string;
  author: string;
  avatarUrl: string;
  content: string;
  timestamp?: number;
  createdAt: Date;
}

interface DropData {
  dropId: string;
  dropMessage: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  baseVersion: {
    stems: Stem[];
  };
  userVersion: {
    stems: Stem[];
  };
  comments: Comment[];
}

interface GlobalPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  activeVersion: 'base' | 'user' | null;
}

interface CommentMarker {
  id: string;
  timestamp: number;
  stemId: string;
  x: number; // pixel position
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const PageContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  flex-direction: column;
  color: white;
  background-color: #000000;
`;

const Header = styled.header`
  flex-shrink: 0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  
  .header-content {
    padding: 2rem;
    border-bottom: 1px solid #333333;
    background-color: #000000;
    
    .header-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;
        
        h1 {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }
      }
      
      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
    }
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  border-radius: 0.5rem;
  padding: 0.625rem 1.5rem;
  font-weight: 500;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  transform: scale(1);
  border: none;
  cursor: pointer;
  
  background-color: ${props => props.variant === 'secondary' ? '#374151' : '#0726D9'};
  
  &:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    transform: scale(1.05);
    background-color: ${props => props.variant === 'secondary' ? '#4B5563' : '#52C5F2'};
  }
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const Sidebar = styled.aside`
  width: 20rem;
  flex-shrink: 0;
  border-right: 1px solid #333333;
  background-color: #000000;
  padding: 1.5rem;
  
  h2 {
    margin-bottom: 1.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
  }
  
  .step-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      
      .step-number {
        display: flex;
        height: 2rem;
        width: 2rem;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 0.875rem;
        font-weight: 600;
        background-color: #FA576A;
        color: white;
      }
      
      .step-content {
        flex: 1;
        
        h3 {
          font-size: 0.875rem;
          font-weight: 500;
          color: white;
          margin: 0 0 0.25rem 0;
        }
        
        p {
          margin: 0;
          font-size: 0.75rem;
          color: #9CA3AF;
        }
      }
    }
  }
`;

const WorkArea = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
`;

const DropInfo = styled.section`
  padding: 1.5rem;
  border-bottom: 1px solid #333333;
  background-color: #000000;
  
  .drop-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    
    img {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
    }
    
    .author-info {
      h2 {
        font-size: 1.125rem;
        font-weight: 600;
        color: white;
        margin: 0;
      }
      
      p {
        color: #D1D5DB;
        margin: 0;
      }
    }
  }
`;

const GlobalControls = styled.section`
  padding: 1.5rem;
  border-bottom: 1px solid #333333;
  background-color: #000000;
  
  .controls-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    
    .play-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 0.5rem;
      padding: 0.75rem 1.5rem;
      font-weight: 500;
      color: white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      transform: scale(1);
      border: none;
      cursor: pointer;
      
      &:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        transform: scale(1.05);
        background-color: #52C5F2;
      }
      
      &.active {
        background-color: #52C5F2;
      }
      
      &.inactive {
        background-color: #0726D9;
      }
    }
  }
  
  .time-markers {
    margin-left: 20rem;
    display: flex;
    justify-content: space-between;
    padding: 0 1rem;
    margin-bottom: 1rem;
    
    .marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .marker-line {
        margin-bottom: 0.5rem;
        height: 0.75rem;
        width: 1px;
        background-color: #333333;
      }
      
      span {
        font-size: 0.875rem;
        color: #9CA3AF;
      }
    }
  }
`;

const StemSection = styled.section`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background-color: #000000;
  
  .stem-group {
    margin-bottom: 2rem;
    
    h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
      margin-bottom: 1rem;
    }
    
    .stem-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  }
`;

const CommentOverlay = styled.div<{ visible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.75rem;
  border-radius: 0.5rem;
  z-index: 50;
  opacity: ${props => props.visible ? 1 : 0};
  transform: translateY(${props => props.visible ? '0' : '-10px'});
  transition: all 0.3s ease;
  pointer-events: none;
  
  .comment-author {
    font-weight: 600;
    font-size: 0.75rem;
    color: #FA576A;
  }
  
  .comment-content {
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
`;

// ============================================================================
// WAVEFORM TRACK COMPONENT
// ============================================================================

interface WaveformTrackProps {
  stem: Stem;
  version: 'base' | 'user';
  globalPlayback: GlobalPlaybackState;
  onGlobalPlay: (version: 'base' | 'user') => void;
  onGlobalPause: () => void;
  onGlobalSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onAddCommentMarker: (timestamp: number, stemId: string, x: number) => void;
  commentMarkers: CommentMarker[];
  timeComments: Comment[];
  badges?: string[];
}

const WaveformTrack: React.FC<WaveformTrackProps> = ({
  stem,
  version,
  globalPlayback,
  onGlobalPlay,
  onGlobalPause,
  onGlobalSeek,
  onVolumeChange,
  onMuteToggle,
  onAddCommentMarker,
  commentMarkers,
  timeComments,
  badges = [],
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [activeComment, setActiveComment] = useState<Comment | null>(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (waveformRef.current && stem.audioUrl !== 'Not Stem') {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: stem.color,
        progressColor: '#52C5F2',
        height: 80,
        normalize: true,
        interact: false, // Disable default interactions
        cursorColor: 'transparent',
      });

      wavesurfer.current.load(stem.audioUrl);

      wavesurfer.current.on('ready', () => {
        setIsLoaded(true);
        setDuration(wavesurfer.current!.getDuration());
      });

      return () => {
        if (wavesurfer.current) {
          wavesurfer.current.destroy();
        }
      };
    }
  }, [stem.audioUrl, stem.color]);

  // Sync with global playback
  useEffect(() => {
    if (wavesurfer.current && isLoaded) {
      const shouldPlay = globalPlayback.isPlaying && 
                        globalPlayback.activeVersion === version && 
                        !stem.isMuted;

      if (shouldPlay) {
        wavesurfer.current.seekTo(globalPlayback.currentTime / duration);
        if (wavesurfer.current.isPlaying() !== shouldPlay) {
          wavesurfer.current.play();
        }
      } else {
        if (wavesurfer.current.isPlaying()) {
          wavesurfer.current.pause();
        }
      }
    }
  }, [globalPlayback, version, duration, isLoaded, stem.isMuted]);

  // Update volume
  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(stem.isMuted ? 0 : stem.volume);
    }
  }, [stem.volume, stem.isMuted]);

  // Handle waveform interactions
  const handleWaveformClick = (e: React.MouseEvent) => {
    if (!waveformRef.current || !isLoaded) return;

    const rect = waveformRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = (x / rect.width) * duration;
    
    // If shift key is held, add comment marker
    if (e.shiftKey) {
      onAddCommentMarker(clickTime, stem.id, x);
    } else {
      // Otherwise, seek to the clicked time
      onGlobalSeek(clickTime);
    }
  };

  const handleWaveformMouseMove = (e: React.MouseEvent) => {
    if (!waveformRef.current || !isLoaded) return;

    const rect = waveformRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hoverTimestamp = (x / rect.width) * duration;
    setHoverTime(hoverTimestamp);
  };

  const handleWaveformMouseLeave = () => {
    setHoverTime(null);
  };

  // Show comment overlay during playback
  useEffect(() => {
    if (globalPlayback.isPlaying && globalPlayback.activeVersion === version) {
      const currentComment = timeComments.find(comment => 
        comment.timestamp && 
        Math.abs(comment.timestamp - globalPlayback.currentTime) < 0.5
      );
      setActiveComment(currentComment || null);
    } else {
      setActiveComment(null);
    }
  }, [globalPlayback.currentTime, globalPlayback.isPlaying, globalPlayback.activeVersion, version, timeComments]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderBadges = () => {
    return badges.map((badge, index) => (
      <span
        key={index}
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          badge === 'New' ? 'bg-green-600 text-green-100' :
          badge === 'Modified' ? 'bg-yellow-600 text-yellow-100' :
          badge === 'Unchanged' ? 'bg-gray-600 text-gray-100' :
          'bg-blue-600 text-blue-100'
        }`}
      >
        {badge}
      </span>
    ));
  };

  return (
    <div
      style={{
        overflow: 'hidden',
        borderRadius: '0.5rem',
        border: '1px solid #3D9DF2',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        transition: 'box-shadow 0.3s ease',
        backgroundColor: '#1760BF',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Track Controls */}
        <div style={{ width: '20rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>
                {stem.name}
              </span>
              {badges.length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {renderBadges()}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#D1D5DB' }}>
              {version === 'user' ? 'User' : 'Base'}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Individual Play Button */}
            <button
              onClick={() => {
                if (globalPlayback.isPlaying && globalPlayback.activeVersion === version) {
                  onGlobalPause();
                } else {
                  onGlobalPlay(version);
                }
              }}
              disabled={stem.audioUrl === 'Not Stem'}
              style={{
                borderRadius: '50%',
                padding: '0.5rem',
                transition: 'all 0.2s ease',
                transform: 'scale(1)',
                backgroundColor: globalPlayback.isPlaying && globalPlayback.activeVersion === version ? '#52C5F2' : '#3D9DF2',
                border: 'none',
                cursor: stem.audioUrl === 'Not Stem' ? 'not-allowed' : 'pointer',
                opacity: stem.audioUrl === 'Not Stem' ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (stem.audioUrl !== 'Not Stem') {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {globalPlayback.isPlaying && globalPlayback.activeVersion === version ? (
                <Pause size={16} color="white" />
              ) : (
                <Play size={16} color="white" />
              )}
            </button>

            {/* Volume Control */}
            <button
              onClick={onMuteToggle}
              style={{
                borderRadius: '50%',
                padding: '0.5rem',
                transition: 'all 0.2s ease',
                transform: 'scale(1)',
                backgroundColor: '#3D9DF2',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {stem.isMuted ? (
                <VolumeX size={16} color="white" />
              ) : (
                <Volume2 size={16} color="white" />
              )}
            </button>

            {/* Volume Slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={stem.volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              style={{
                width: '4rem',
                height: '0.5rem',
                borderRadius: '0.5rem',
                appearance: 'none',
                cursor: 'pointer',
                background: `linear-gradient(to right, #52C5F2 0%, #52C5F2 ${stem.volume * 100}%, #6b7280 ${stem.volume * 100}%, #6b7280 100%)`,
              }}
            />

            {/* Solo Button */}
            <button
              style={{
                borderRadius: '50%',
                padding: '0.5rem',
                transition: 'all 0.2s ease',
                transform: 'scale(1)',
                backgroundColor: '#3D9DF2',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Headphones size={16} color="white" />
            </button>
          </div>
        </div>

        {/* Waveform Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div
            ref={waveformRef}
            onClick={handleWaveformClick}
            onMouseMove={handleWaveformMouseMove}
            onMouseLeave={handleWaveformMouseLeave}
            style={{
              height: '5rem',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              position: 'relative',
              minHeight: '80px',
            }}
          >
            {stem.audioUrl === 'Not Stem' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>No Audio</span>
              </div>
            )}
            
            {/* Global Playhead */}
            {globalPlayback.activeVersion === version && duration > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${(globalPlayback.currentTime / duration) * 100}%`,
                  width: '2px',
                  backgroundColor: '#52C5F2',
                  zIndex: 30,
                  transition: 'left 0.1s ease',
                }}
              />
            )}
            
            {/* Ghost Playhead on Hover */}
            {hoverTime !== null && duration > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${(hoverTime / duration) * 100}%`,
                  width: '2px',
                  backgroundColor: '#52C5F2',
                  opacity: 0.5,
                  zIndex: 25,
                  transition: 'opacity 0.2s ease',
                }}
              />
            )}
            
            {/* Comment Markers */}
            {commentMarkers
              .filter(marker => marker.stemId === stem.id)
              .map((marker) => (
                <div
                  key={marker.id}
                  style={{
                    position: 'absolute',
                    top: '0.25rem',
                    left: `${(marker.timestamp / duration) * 100}%`,
                    width: '1rem',
                    height: '1rem',
                    backgroundColor: '#FA576A',
                    borderRadius: '50%',
                    border: '2px solid white',
                    cursor: 'pointer',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <MessageCircle size={8} color="white" />
                </div>
              ))}
          </div>

          {/* Dynamic Comment Overlay */}
          <CommentOverlay visible={!!activeComment}>
            {activeComment && (
              <>
                <div className="comment-author">{activeComment.author}</div>
                <div className="comment-content">{activeComment.content}</div>
              </>
            )}
          </CommentOverlay>

          {/* Time Display */}
          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#D1D5DB', textAlign: 'center' }}>
            {formatTime(globalPlayback.currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN DROP REVIEW PAGE COMPONENT
// ============================================================================

const DropReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showWarning } = useToast();
  
  // Global playback state - lifted up for synchronization
  const [globalPlayback, setGlobalPlayback] = useState<GlobalPlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    activeVersion: null,
  });
  
  const [commentMarkers, setCommentMarkers] = useState<CommentMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<CommentMarker | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  
  const playbackIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // State for drop data and loading
  const [dropData, setDropData] = useState<DropData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeComments, setTimeComments] = useState<Comment[]>([]);
  const [newGeneralComment, setNewGeneralComment] = useState('');

  // Fetch drop data on mount
  useEffect(() => {
    const fetchDropData = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const dropId = queryParams.get('dropId');
        const trackId = queryParams.get('trackId');
        
        if (!dropId) {
          throw new Error('Drop ID not found in URL');
        }

        console.log('=== Fetching Drop Data ===');
        console.log('dropId:', dropId);
        console.log('trackId:', trackId);

        // Fetch the drop details
        const dropResponse = await DropService.getDropById(dropId);
        console.log('=== Drop API Response ===');
        console.log('dropData:', dropResponse);

        // Fetch the comparison result
        if(!trackId || !dropId){
          throw new Error('Track ID not found in URL');
        }
        const selectionResponse = await MasterStemService.compareDropSelectionWithMaster(trackId, dropId);
        console.log('=== Selection API Response ===');
        console.log('selectionData:', selectionResponse);

        
        // Transform API response to component state
        const transformedDropData: DropData = {
          dropId: dropResponse.data.id,
          dropMessage: dropResponse.data.description || '',
          author: {
            name: dropResponse.data.drop_by?.name || 'Unknown User',
            avatarUrl: dropResponse.data.drop_by?.avatar_url || '/api/placeholder/40/40'
          },
          baseVersion: {
            stems: []
          },
          userVersion: {
            stems: []
          },
          comments: dropResponse.data.drop_comments?.map((comment: any) => ({
            id: comment.id,
            author: comment.user?.name || 'Unknown User',
            avatarUrl: comment.user?.avatar_url || '/api/placeholder/32/32',
            content: comment.comment,
            createdAt: new Date(comment.create_at)
          })) || []
        };

        // Transform selection data to stems
        const colors = ['#b91c1c', '#c2410c', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#65a30d', '#2563eb'];
        let colorIndex = 0;

        selectionResponse.data.forEach((item: any, index: number) => {
          const color = colors[colorIndex % colors.length];
          colorIndex++;

          if (item.type === 'modify') {
            // Add base version (master stem)
            transformedDropData.baseVersion.stems.push({
              id: `base-${index}`,
              name: `Master ${item.master_stem?.file_name || 'Unknown'}`,
              audioUrl: item.master_stem?.file_path || 'Not Stem',
              color,
              status: 'modified',
              isMuted: false,
              volume: 0.8,
              isPlaying: false,
            });

            // Add user version (drop selection)
            transformedDropData.userVersion.stems.push({
              id: `user-${index}`,
              name: `User ${item.stem_file?.file_name || 'Unknown'}`,
              audioUrl: item.stem_file?.file_path || 'Not Stem',
              color,
              status: 'modified',
              isMuted: false,
              volume: 0.8,
              isPlaying: false,
            });
          } else if (item.type === 'new') {
            // Add only user version for new stems
            transformedDropData.userVersion.stems.push({
              id: `user-${index}`,
              name: `User ${item.stem_file?.file_name || 'Unknown'}`,
              audioUrl: item.stem_file?.file_path || 'Not Stem',
              color,
              status: 'added',
              isMuted: false,
              volume: 0.8,
              isPlaying: false,
            });
          } else if (item.type === 'unchanged') {
            // Add only base version for unchanged stems
            transformedDropData.baseVersion.stems.push({
              id: `base-${index}`,
              name: `Master ${item.master_stem?.file_name || 'Unknown'}`,
              audioUrl: item.master_stem?.file_path || 'Not Stem',
              color,
              status: 'unchanged',
              isMuted: false,
              volume: 0.8,
              isPlaying: false,
            });
          }
        });

        console.log('=== Transformed Drop Data ===');
        console.log('Base stems:', transformedDropData.baseVersion.stems);
        console.log('User stems:', transformedDropData.userVersion.stems);

        setDropData(transformedDropData);

      } catch (err) {
        console.error('=== Error fetching drop data ===');
        console.error('Error details:', err);
        setError('Failed to fetch drop data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDropData();
  }, [location.search]);

  // Process stems into structured groups
  const structuredStems = useCallback(() => {
    if (!dropData) return { comparedStems: [], newStems: [], unchangedStems: [] };

    const comparedStems: { base: Stem; user: Stem }[] = [];
    const newStems: Stem[] = [];
    const unchangedStems: Stem[] = [];

    // API에서 이미 올바르게 분류된 데이터를 그대로 사용
    const baseStems = dropData.baseVersion.stems;
    const userStems = dropData.userVersion.stems;

    // modified status를 가진 base stems와 user stems를 매칭
    const modifiedBaseStems = baseStems.filter(stem => stem.status === 'modified');
    const modifiedUserStems = userStems.filter(stem => stem.status === 'modified');

    // 같은 색상으로 매칭
    modifiedBaseStems.forEach(baseStem => {
      const matchingUserStem = modifiedUserStems.find(userStem => userStem.color === baseStem.color);
      if (matchingUserStem) {
        comparedStems.push({ base: baseStem, user: matchingUserStem });
        console.log(`Matched: ${baseStem.name} <-> ${matchingUserStem.name}`);
      } else {
        console.log(`No match found for base stem: ${baseStem.name}`);
      }
    });

    // added status를 가진 user stems
    const addedStems = userStems.filter(stem => stem.status === 'added');
    newStems.push(...addedStems);
    console.log('Added stems:', addedStems);

    // unchanged status를 가진 base stems
    const unchangedStemsList = baseStems.filter(stem => stem.status === 'unchanged');
    unchangedStems.push(...unchangedStemsList);
    console.log('Unchanged stems:', unchangedStemsList);

    console.log('=== Final Structured Stems ===');
    console.log('Compared stems:', comparedStems);
    console.log('New stems:', newStems);
    console.log('Unchanged stems:', unchangedStems);

    return { comparedStems, newStems, unchangedStems };
  }, [dropData]);

  // Global playback control functions
  const handleGlobalPlay = useCallback((version: 'base' | 'user') => {
    setGlobalPlayback(prev => ({
      ...prev,
      isPlaying: true,
      activeVersion: version,
    }));
    
    // Start time tracking
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
    
    playbackIntervalRef.current = setInterval(() => {
      setGlobalPlayback(prev => ({
        ...prev,
        currentTime: prev.currentTime + 0.1,
      }));
    }, 100);
  }, []);

  const handleGlobalPause = useCallback(() => {
    setGlobalPlayback(prev => ({
      ...prev,
      isPlaying: false,
    }));
    
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  }, []);

  const handleGlobalSeek = useCallback((time: number) => {
    setGlobalPlayback(prev => ({
      ...prev,
      currentTime: time,
    }));
  }, []);

  // Stem control functions
  const handleVolumeChange = useCallback((stemId: string, version: 'base' | 'user', volume: number) => {
    if (!dropData) return;
    
    setDropData(prev => {
      if (!prev) return prev;
      
      const newDropData = { ...prev };
      const stems = version === 'base' ? newDropData.baseVersion.stems : newDropData.userVersion.stems;
      const stemIndex = stems.findIndex(stem => stem.id === stemId);
      
      if (stemIndex !== -1) {
        stems[stemIndex] = { ...stems[stemIndex], volume };
      }
      
      return newDropData;
    });
  }, [dropData]);

  const handleMuteToggle = useCallback((stemId: string, version: 'base' | 'user') => {
    if (!dropData) return;
    
    setDropData(prev => {
      if (!prev) return prev;
      
      const newDropData = { ...prev };
      const stems = version === 'base' ? newDropData.baseVersion.stems : newDropData.userVersion.stems;
      const stemIndex = stems.findIndex(stem => stem.id === stemId);
      
      if (stemIndex !== -1) {
        stems[stemIndex] = { ...stems[stemIndex], isMuted: !stems[stemIndex].isMuted };
      }
      
      return newDropData;
    });
  }, [dropData]);

  // Comment marker functions
  const handleAddCommentMarker = useCallback((timestamp: number, stemId: string, x: number) => {
    const newMarker: CommentMarker = {
      id: `marker-${Date.now()}`,
      timestamp,
      stemId,
      x,
    };
    
    setCommentMarkers(prev => [...prev, newMarker]);
    setSelectedMarker(newMarker);
  }, []);

  const handleCreateComment = useCallback(() => {
    if (!selectedMarker || !newCommentContent.trim()) return;
    
    const newComment: Comment = {
      id: `time-comment-${Date.now()}`,
      author: 'Current User',
      avatarUrl: '/api/placeholder/32/32',
      content: newCommentContent.trim(),
      timestamp: selectedMarker.timestamp,
      createdAt: new Date()
    };
    
    setTimeComments(prev => [...prev, newComment]);
    setNewCommentContent('');
    setShowCommentModal(false);
    setSelectedMarker(null);
    showSuccess('Timeline comment added successfully.');
  }, [selectedMarker, newCommentContent, showSuccess]);

  const handleAddGeneralComment = useCallback(() => {
    if (!newGeneralComment.trim() || !dropData) return;
    
    const newComment: Comment = {
      id: `general-comment-${Date.now()}`,
      author: 'Current User',
      avatarUrl: '/api/placeholder/32/32',
      content: newGeneralComment.trim(),
      createdAt: new Date()
    };
    
    setDropData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: [...prev.comments, newComment]
      };
    });
    setNewGeneralComment('');
    showSuccess('Comment added successfully.');
  }, [newGeneralComment, dropData, showSuccess]);

  // Action handlers
  const handleApprove = useCallback(async () => {
    if(!dropData?.dropId){
      throw new Error('Drop ID not found');
    }
    try {
      await DropReviewerService.approveDropReviewer(dropData.dropId);
    } catch (error) {
      console.error('Error approving drop:', error);
    }
    showSuccess('Drop approved successfully!');
    navigate('/pr-detail');
  }, [navigate, showSuccess, dropData]);

  const handleReject = useCallback(async () => {
    if(!dropData?.dropId){
      throw new Error('Drop ID not found');
    }
    try {
      await DropReviewerService.rejectDropReviewer(dropData.dropId);
    } catch (error) {
      console.error('Error rejecting drop:', error);
    }
    showWarning('Drop rejected.');
    navigate('/pr-detail');
  }, [navigate, showWarning, dropData]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  const { comparedStems, newStems, unchangedStems } = structuredStems();
  const timeMarkers = Array.from({ length: 9 }, (_, i) => i);

  if (loading) {
    return <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>{error}</div>;
  }

  if (!dropData) {
    return <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>Drop data not found.</div>;
  }

  return (
    <PageContainer>
      {/* Header */}
      <Header>
        <div className="header-content">
          <div className="header-flex">
            <div className="header-left">
              <Logo />
              <h1>Drop Review</h1>
            </div>
            <div className="header-actions">
              <ActionButton 
                variant="secondary"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </ActionButton>
            </div>
          </div>
        </div>
      </Header>

      <MainContent>
        {/* Sidebar */}
        <Sidebar>
          <h2>Review Process</h2>
          <div className="step-list">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Compare Versions</h3>
                <p>Review differences between Base and User versions</p>
              </div>
            </div>
          </div>
        </Sidebar>

        {/* Work Area */}
        <WorkArea>
          {/* Drop Info */}
          <DropInfo>
            <div className="drop-header">
              <img 
                src={dropData.author.avatarUrl} 
                alt={dropData.author.name}
              />
              <div className="author-info">
                <h2>{dropData.author.name}</h2>
                <p>{dropData.dropMessage}</p>
              </div>
            </div>
          </DropInfo>

          {/* Global Controls */}
          <GlobalControls>
            <div className="controls-header">
              <button
                className={`play-button ${globalPlayback.isPlaying && globalPlayback.activeVersion === 'user' ? 'active' : 'inactive'}`}
                onClick={() => {
                  if (globalPlayback.isPlaying && globalPlayback.activeVersion === 'user') {
                    handleGlobalPause();
                  } else {
                    handleGlobalPlay('user');
                  }
                }}
              >
                {globalPlayback.isPlaying && globalPlayback.activeVersion === 'user' ? 
                  <Pause size={20} /> : <Play size={20} />
                }
                <span>Play User Version</span>
              </button>
              
              <button
                className={`play-button ${globalPlayback.isPlaying && globalPlayback.activeVersion === 'base' ? 'active' : 'inactive'}`}
                onClick={() => {
                  if (globalPlayback.isPlaying && globalPlayback.activeVersion === 'base') {
                    handleGlobalPause();
                  } else {
                    handleGlobalPlay('base');
                  }
                }}
              >
                {globalPlayback.isPlaying && globalPlayback.activeVersion === 'base' ? 
                  <Pause size={20} /> : <Play size={20} />
                }
                <span>Play Base Version</span>
              </button>
            </div>

            {/* Time Markers */}
            <div className="time-markers">
              {timeMarkers.map((marker) => (
                <div key={marker} className="marker">
                  <div className="marker-line"></div>
                  <span>{marker}s</span>
                </div>
              ))}
            </div>
          </GlobalControls>

          {/* Stem Sections */}
          <StemSection>
            {/* Compared Stems */}
            {comparedStems.length > 0 && (
              <div className="stem-group">
                <h3>Compared Stems</h3>
                <div className="stem-list">
                  {comparedStems.map(({ base, user }, index) => (
                    <div key={`compared-${index}`} style={{ marginBottom: '1rem' }}>
                      <WaveformTrack
                        stem={base}
                        version="base"
                        globalPlayback={globalPlayback}
                        onGlobalPlay={handleGlobalPlay}
                        onGlobalPause={handleGlobalPause}
                        onGlobalSeek={handleGlobalSeek}
                        onVolumeChange={(volume) => handleVolumeChange(base.id, 'base', volume)}
                        onMuteToggle={() => handleMuteToggle(base.id, 'base')}
                        onAddCommentMarker={handleAddCommentMarker}
                        commentMarkers={commentMarkers}
                        timeComments={timeComments}
                        badges={['Modified']}
                      />
                      <div style={{ marginTop: '0.5rem' }}>
                        <WaveformTrack
                          stem={user}
                          version="user"
                          globalPlayback={globalPlayback}
                          onGlobalPlay={handleGlobalPlay}
                          onGlobalPause={handleGlobalPause}
                          onGlobalSeek={handleGlobalSeek}
                          onVolumeChange={(volume) => handleVolumeChange(user.id, 'user', volume)}
                          onMuteToggle={() => handleMuteToggle(user.id, 'user')}
                          onAddCommentMarker={handleAddCommentMarker}
                          commentMarkers={commentMarkers}
                          timeComments={timeComments}
                          badges={['Modified']}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Stems */}
            {newStems.length > 0 && (
              <div className="stem-group">
                <h3>New Stems</h3>
                <div className="stem-list">
                  {newStems.map((stem) => (
                    <WaveformTrack
                      key={stem.id}
                      stem={stem}
                      version="user"
                      globalPlayback={globalPlayback}
                      onGlobalPlay={handleGlobalPlay}
                      onGlobalPause={handleGlobalPause}
                      onGlobalSeek={handleGlobalSeek}
                      onVolumeChange={(volume) => handleVolumeChange(stem.id, 'user', volume)}
                      onMuteToggle={() => handleMuteToggle(stem.id, 'user')}
                      onAddCommentMarker={handleAddCommentMarker}
                      commentMarkers={commentMarkers}
                      timeComments={timeComments}
                      badges={['New']}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unchanged Stems */}
            {unchangedStems.length > 0 && (
              <div className="stem-group">
                <h3>Unchanged Stems</h3>
                <div className="stem-list">
                  {unchangedStems.map((stem) => (
                    <WaveformTrack
                      key={stem.id}
                      stem={stem}
                      version="base"
                      globalPlayback={globalPlayback}
                      onGlobalPlay={handleGlobalPlay}
                      onGlobalPause={handleGlobalPause}
                      onGlobalSeek={handleGlobalSeek}
                      onVolumeChange={(volume) => handleVolumeChange(stem.id, 'base', volume)}
                      onMuteToggle={() => handleMuteToggle(stem.id, 'base')}
                      onAddCommentMarker={handleAddCommentMarker}
                      commentMarkers={commentMarkers}
                      timeComments={timeComments}
                      badges={['Unchanged']}
                    />
                  ))}
                </div>
              </div>
            )}
          </StemSection>
        </WorkArea>
      </MainContent>

      {/* Bottom Panel - Comments and Actions */}
      <div style={{
        borderTop: '1px solid #333333',
        padding: '1.5rem',
        backgroundColor: '#000000',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
        }}>
          {/* Comments Section */}
          <div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'white',
              marginBottom: '1rem',
            }}>Comments</h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxHeight: '10rem',
              overflowY: 'auto',
              marginBottom: '1rem',
            }}>
              {dropData?.comments.map((comment) => (
                <div key={comment.id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#1a1a1a',
                }}>
                  <img 
                    src={comment.avatarUrl} 
                    alt={comment.author}
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ fontWeight: '500', color: 'white' }}>{comment.author}</span>
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        {comment.createdAt.toLocaleString()}
                      </span>
                    </div>
                    <p style={{
                      color: '#D1D5DB',
                      fontSize: '0.875rem',
                      marginTop: '0.25rem',
                      margin: 0,
                    }}>{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newGeneralComment}
                onChange={(e) => setNewGeneralComment(e.target.value)}
                placeholder="Add a comment..."
                style={{
                  flex: 1,
                  backgroundColor: '#374151',
                  color: 'white',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  outline: 'none',
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddGeneralComment()}
              />
              <button
                onClick={handleAddGeneralComment}
                style={{
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}>
            <button
              onClick={handleApprove}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#10B981',
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: 'scale(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10B981';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <CheckCircle size={20} />
              <span>Drop In (Approve)</span>
            </button>
            <button
              onClick={handleReject}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#EF4444',
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: 'scale(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#DC2626';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#EF4444';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <XCircle size={20} />
              <span>Drop Out (Reject)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Comment Button (floating) */}
      {selectedMarker && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 50,
        }}>
          <button
            onClick={() => setShowCommentModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#FA576A',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '50px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              transform: 'scale(1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
            }}
          >
            <Plus size={20} />
            <span>Add Comment</span>
          </button>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && selectedMarker && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            backgroundColor: '#1F2937',
            padding: '2rem',
            borderRadius: '0.5rem',
            width: '24rem',
            maxWidth: '90vw',
          }}>
            <h4 style={{
              color: 'white',
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '1rem',
            }}>
              Add Comment at {Math.floor(selectedMarker.timestamp / 60)}:{Math.floor(selectedMarker.timestamp % 60).toString().padStart(2, '0')}
            </h4>
            <textarea
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              placeholder="Enter your comment..."
              style={{
                width: '100%',
                height: '5rem',
                backgroundColor: '#374151',
                color: 'white',
                borderRadius: '0.375rem',
                padding: '0.75rem',
                resize: 'none',
                border: 'none',
                outline: 'none',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1rem',
            }}>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedMarker(null);
                  setNewCommentContent('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6B7280',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5563';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6B7280';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateComment}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default DropReviewPage;
