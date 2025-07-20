import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, List } from 'lucide-react';
import { Button } from '.';
import { Track } from '../types/api';
import streamingService, {
  StemStreamingInfo,
} from '../services/streamingService';
import { getLatestStage } from '../services/stageService';
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
  lastApprovedStageId?: string;
}

const Trackinfocardjjm: React.FC<TrackinfocardjjmProps> = ({
  track,
  onShowAllStems,
  // versionNumber,
  stemsLoading = false,
  // stageId,
  lastApprovedStageId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [guideUrl, setGuideUrl] = useState<string | undefined>(undefined);
  const [guideLoading, setGuideLoading] = useState(false);
  const guideAudioRef = useRef<HTMLAudioElement>(null);

  const handlePlayClick = async () => {
    if (!isPlaying) {
      try {
        setGuideLoading(true);
        let stageId = lastApprovedStageId;
        
        // lastApprovedStageId가 없으면 최신 stage를 가져와서 사용
        if (!stageId) {
          console.log('No approved stage found, fetching latest stage...');
          const latestStage = await getLatestStage(track.id);
          if (latestStage) {
            stageId = latestStage.id;
            console.log('Using latest stage:', stageId);
          } else {
            console.warn('No stages found for this track');
            return;
          }
        }

        if (!stageId) {
          console.warn('No stage ID available for playback');
          return;
        }

        const response = await streamingService.getGuidePresignedUrlByStageId(stageId);

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
    <div className='relative overflow-hidden rounded-3xl bg-black px-15 py-10 shadow-2xl' data-section="track-info">
      {/* Background overlay pattern */}
      <div className='absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40'></div>

      <div className='relative z-10 flex flex-row gap-6 lg:flex-row justify-center'>

        {/* Right side - Album cover */}
        <div className='w-full md:w-1/3 flex-shrink-0 lg:ml-8 flex justify-center'>
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
                className='rounded-full bg-white/20 p-6 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30 z-10 relative'
                disabled={stemsLoading || guideLoading || !lastApprovedStageId}
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

        <div className='w-full md:w-2/3 flex flex-row gap-10 pl-10'>
          {/* Left side: title, date, tag, description, version */}
          <div className='flex-1 space-y-6'>
            {/* Header label */}
            <div>
              {/* Main title */}
              <div>
                <h1 className='text-2xl font-black uppercase tracking-tight text-white lg:text-6xl xl:text-7xl'>
                  {track.title}
                </h1>
              </div>

              {/* Created Date */}
              <div className='flex items-center gap-4 pt-3'>
                <p className='text-sm text-white/70'>
                  {new Date(track.created_date).toLocaleDateString('en-US')}
                </p>
              </div>

              {/* Track details tags */}
              <div className='flex flex-wrap gap-3 pt-1'>
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

              {/* Description */}
              <div className='pt-2'>
                <p className='max-w-md text-sm leading-relaxed text-white/80 lg:text-xl'>
                  {track.description || 'Enjoy vivid emotions with this stunning music album. Each track is a story.'}
                </p>
              </div>

              {/* Latest Version */}
              <div className='flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:gap-6'>
                <h2 className='text-lg font-semibold text-white/70 sm:min-w-fit sm:whitespace-nowrap'>
                  Latest Version:
                </h2>

                <div className='flex flex-col gap-3 sm:flex-row sm:gap-4'>
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
                    <List className="w-4 h-4" />
                    <span className='font-semibold'>Stems</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: members */}
          <div className='flex-1'>
            <div className='flex items-center gap-4'>
              <p className='text-sm text-white/70'>Members:</p>
              <Collaborators track={track} />
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
