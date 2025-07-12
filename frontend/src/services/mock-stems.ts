export interface Stem {
  id: number;
  name: string;
  type: 'master' | 'update';
  url: string;
  waveformSrc: string;
  duration: number;
  isActive: boolean;
}

export const mockStems: Stem[] = [
  {
    id: 1,
    name: 'Intro',
    type: 'master',
    url: '/audio/track_ex.wav',
    waveformSrc: '/waveforms/intro-master.png',
    duration: 32.5,
    isActive: true
  },
  {
    id: 2,
    name: 'Intro',
    type: 'update',
    url: '/audio/track_ex.wav',
    waveformSrc: '/waveforms/intro-update.png',
    duration: 32.5,
    isActive: true
  },
  {
    id: 3,
    name: 'Verse',
    type: 'master',
    url: '/audio/track_ex.wav',
    waveformSrc: '/waveforms/verse-master.png',
    duration: 48.2,
    isActive: true
  },
  {
    id: 4,
    name: 'Verse',
    type: 'update',
    url: '/audio/track_ex.wav',
    waveformSrc: '/waveforms/verse-update.png',
    duration: 48.2,
    isActive: true
  },
  {
    id: 5,
    name: 'Chorus',
    type: 'master',
    url: '/audio/track_ex.wav',
    waveformSrc: '/waveforms/chorus-master.png',
    duration: 41.8,
    isActive: true
  },
  {
    id: 6,
    name: 'Chorus',
    type: 'update',
    url: '/audio/track_ex.wav',
    waveformSrc: '/waveforms/chorus-update.png',
    duration: 41.8,
    isActive: true
  },
  {
    id: 7,
    name: 'Bridge',
    type: 'master',
    url: '/audio/track_ex.wav',
    waveformSrc: '/waveforms/bridge-master.png',
    duration: 28.1,
    isActive: true
  },
  {
    id: 8,
    name: 'Bridge',
    type: 'update',
    url: '/audio/track_ex.wav',
    waveformSrc: '/waveforms/bridge-update.png',
    duration: 28.1,
    isActive: true
  }
];
