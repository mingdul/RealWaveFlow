import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '.';
import { Track } from '../types/api';
import streamingService, {
  StemStreamingInfo,
} from '../services/streamingService';
import PresignedImage from './PresignedImage';
import Collaborators from './Collaborators';

interface TrackinfocardjjmProps {
  track: Track;
  stems?: StemStreamingInfo[];
  onPlay?: () => void;
  onShowAllStems?: () => void;
  onRollBack?: () => void;
  stemsLoading?: boolean;
  versionNumber?: string;
  stageId?: string;
  guideUrl?: string;
}

const Trackinfocardjjm: React.FC<TrackinfocardjjmProps> = ({
  track,
  onShowAllStems,
  versionNumber,
  stemsLoading = false,
  stageId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [guideUrl, setGuideUrl] = useState<string | undefined>(undefined);
  const [guideLoading, setGuideLoading] = useState(false);
  const guideAudioRef = useRef<HTMLAudioElement>(null);

  const handlePlayClick = async () => {
    if (!isPlaying && stageId) {
      try {
        setGuideLoading(true);
        const response =
          await streamingService.getGuidePresignedUrlByStageId(stageId);

        console.log('Guide API response:', response);

        if (response.success && response.data) {
          setGuideUrl(response.data.presignedUrl);
          setIsPlaying(true);
        } else {
          console.error('Failed to fetch guide:', response.message);
        }
      } catch (error) {
        console.error('Error fetching guide:', error);
      } finally {
        setGuideLoading(false);
      }
    } else {
      // 정지
      if (guideAudioRef.current) {
        guideAudioRef.current.pause();
        guideAudioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setGuideUrl(undefined);
    }
  };

  useEffect(() => {
    const guideAudio = guideAudioRef.current;
    if (!guideAudio || !guideUrl) return;

    if (isPlaying) {
      guideAudio.play().catch(console.error);
    } else {
      guideAudio.pause();
    }
  }, [isPlaying, guideUrl]);

  const handleShowAllStems = () => {
    if (onShowAllStems) {
      onShowAllStems();
    }
  };

  return (
    <div className='relative overflow-hidden rounded-3xl bg-black p-8 shadow-2xl transition-all duration-500'>
      {/* Background overlay pattern */}
      <div className='absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40'></div>

      <div className='relative z-10 flex flex-col gap-6 lg:flex-row'>
        {/* Left side content */}
        <div className='flex-1 space-y-4'>
          {/* Header label */}
          {/* Main title */}
          <div className='space-y-5'>
            <h1 className='text-2xl font-black uppercase tracking-tight text-white lg:text-6xl xl:text-7xl'>
              {track.title}
            </h1>
            <p className='max-w-md text-sm leading-relaxed text-white/80 lg:text-xl'>
              {track.description ||
                'Enjoy vivid emotions with this stunning music album. Each track is a story.'}
            </p>
          </div>

          {/* Owner and version info */}
          <div className='flex items-center gap-4 pt-2'>
            <p className='text-sm text-white/70'>
              Owner:{' '}
              <span className='font-semibold text-white'>
                {track.owner_id.username}
              </span>
            </p>

            <p className='text-sm text-white/70'>
              {new Date(track.created_date).toLocaleDateString('en-US')}
            </p>
            <Collaborators track={track} />
          </div>

          {/* Action buttons */}
          {/* <div className='flex flex-col gap-3 pt-6 sm:flex-row'>

            <h2 className='text-lg text-white/70'>
              Version: <span className='font-semibold text-white'>{versionNumber}</span>
            </h2>

            <Button
              variant='primary'
              size='sm'
              className='flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-black shadow-xl transition-all duration-300 hover:bg-white/90 hover:scale-105 hover:shadow-2xl'
              onClick={handlePlayClick}
              disabled={stemsLoading || guideLoading}
            >
              {stemsLoading || guideLoading ? (
                <div className='h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent' />
              ) : isPlaying ? (
                <Pause size={24} />
              ) : (
                <Play size={24} />
              )}
              <span className='text-lg font-semibold'>
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </span>
            </Button>
            
            <Button
              variant='waveflowbtn'
              size='sm'
              className='flex items-center justify-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-8 py-4 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:scale-105'
              onClick={handleShowAllStems}
            >
              <span className='font-semibold'>View All Stems</span>
            </Button>
          </div> */}
          <div className='flex flex-col gap-3 pt-6 sm:flex-row sm:items-center'>
            <h2 className='text-lg font-semibold text-white/70 sm:min-w-fit sm:whitespace-nowrap'>
              Version: <span className='text-white'>{versionNumber}</span>
            </h2>

            <Button
              variant='primary'
              size='sm'
              className='flex items-center justify-center gap-2 rounded-full bg-white px-4 py-1.5 text-lg leading-none text-black shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/90 hover:shadow-2xl'
              onClick={handlePlayClick}
              disabled={stemsLoading || guideLoading}
            >
              {stemsLoading || guideLoading ? (
                <div className='h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent' />
              ) : isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
              <span className='font-semibold'>
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </span>
            </Button>

            <Button
              variant='waveflowbtn'
              size='sm'
              className='flex items-center justify-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-4 py-1.5 text-lg leading-none text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/20'
              onClick={handleShowAllStems}
            >
              <span className='font-semibold'>View All Stems</span>
            </Button>
          </div>
          {/* Track details tags */}
          <div className='flex flex-wrap gap-3 pt-2'>
            <span className='rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm'>
              {track.genre}
            </span>
            <span className='rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm'>
              {track.bpm} bpm
            </span>
            <span className='rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm'>
              {track.key_signature} key
            </span>
          </div>
        </div>

        {/* Right side - Album cover */}
        <div className='flex-shrink-0 lg:ml-8'>
          <div className='group relative'>
            <PresignedImage
              trackId={track.id}
              imageUrl={track.image_url}
              alt={track.title}
              className='relative h-72 w-72 rounded-2xl object-cover shadow-2xl transition-all duration-500 group-hover:scale-105 lg:h-80 lg:w-80 xl:h-96 xl:w-96'
            />
            <div className='absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-all duration-300 group-hover:opacity-100'>
              <button
                onClick={handlePlayClick}
                className='rounded-full bg-white/20 p-6 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30'
                disabled={stemsLoading || guideLoading}
              >
                {stemsLoading || guideLoading ? (
                  <div className='h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent' />
                ) : isPlaying ? (
                  <Pause className='h-10 w-10 text-white' />
                ) : (
                  <Play className='ml-1 h-10 w-10 text-white' />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element for Guide Playback */}
      {guideUrl && (
        <audio
          ref={guideAudioRef}
          src={guideUrl}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error('Audio playback error:', e);
            setIsPlaying(false);
            setGuideUrl(undefined);
          }}
        />
      )}
    </div>
  );
};

export default Trackinfocardjjm;
