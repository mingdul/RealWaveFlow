import React, { useState, useEffect } from 'react';
import collaboratorService, { TrackUsersResponse, TrackUser } from '../services/collaboratorService';

interface TrackCollaboratorsProps {
  trackId: string;
}

const TrackCollaborators: React.FC<TrackCollaboratorsProps> = ({ trackId }) => {
  const [trackUsers, setTrackUsers] = useState<TrackUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrackUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await collaboratorService.getTrackUsers(trackId);
        if (response.success) {
          setTrackUsers(response.data);
        } else {
          setError('콜라보레이터 정보를 가져올 수 없습니다.');
        }
      } catch (err: any) {
        console.error('[TrackCollaborators] Error loading track users:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (trackId) {
      loadTrackUsers();
    }
  }, [trackId]);

  const UserAvatar: React.FC<{ user: TrackUser; isOwner?: boolean }> = ({ user, isOwner = false }) => {
    const getUserInitial = () => {
      return user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';
    };

    return (
      <div className="relative group">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center border-2 border-white/20 hover:border-white/40 transition-all duration-200">
          {user.image_url ? (
            <img
              src={user.image_url}
              alt={user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-semibold">
              {getUserInitial()}
            </span>
          )}
        </div>
        
        {/* Owner Crown */}
        {isOwner && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-black shadow-lg">
            <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          <div className="font-semibold">{user.username}</div>
          <div className="text-gray-300">{user.email}</div>
          {isOwner && <div className="text-yellow-400">👑 Owner</div>}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80"></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-md backdrop-blur-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Collaborators</h3>
        <div className="flex items-center space-x-2">
          <div className="animate-pulse">
            <div className="w-10 h-10 bg-white/20 rounded-full"></div>
          </div>
          <div className="animate-pulse">
            <div className="w-10 h-10 bg-white/20 rounded-full"></div>
          </div>
          <div className="animate-pulse">
            <div className="w-10 h-10 bg-white/20 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 shadow-md backdrop-blur-lg">
        <h3 className="text-lg font-semibold text-white mb-2">Collaborators</h3>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!trackUsers) {
    return null;
  }

  const allUsers = [trackUsers.owner, ...trackUsers.collaborators.collaborator];

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-md backdrop-blur-lg">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Collaborators
        <span className="ml-2 text-sm text-gray-400">({allUsers.length})</span>
      </h3>
      
      <div className="flex flex-wrap items-center gap-3">
        {/* Owner */}
        <UserAvatar user={trackUsers.owner} isOwner={true} />
        
        {/* Collaborators */}
        {trackUsers.collaborators.collaborator.map((collaborator) => (
          <UserAvatar key={collaborator.id} user={collaborator} />
        ))}
        
        {/* Add collaborator button */}
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center hover:border-white/50 hover:bg-white/5 transition-all duration-200 cursor-pointer group">
          <svg className="w-5 h-5 text-white/50 group-hover:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>

      {/* Additional info */}
      {trackUsers.collaborators.collaborator.length === 0 && (
        <p className="text-gray-400 text-sm mt-3 italic">
          No collaborators yet. Invite others to work on this track!
        </p>
      )}
    </div>
  );
};

export default TrackCollaborators;