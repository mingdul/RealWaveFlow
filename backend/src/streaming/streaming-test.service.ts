import { Injectable } from '@nestjs/common';

@Injectable()
export class StreamingTestService {
  // 로컬 테스트용 Mock 데이터
  getMockTrackStems(trackId: string) {
    return {
      success: true,
      data: {
        trackId,
        trackInfo: {
          name: 'Test Track',
          description: 'Local test track',
          genre: 'Electronic',
          bpm: '120',
          key_signature: 'C Major',
        },
        stems: [
          {
            id: 'stem-1',
            fileName: 'drums.wav',
            category: 'drums',
            tag: 'kick',
            key: 'C',
            description: 'Drum track',
            presignedUrl: 'https://example.com/mock-drums.wav',
            metadata: {
              duration: 180,
              fileSize: 5242880,
              sampleRate: 44100,
              channels: 2,
              format: 'wav',
            },
            uploadedBy: {
              id: 'user-1',
              username: 'testuser',
            },
            uploadedAt: new Date().toISOString(),
          },
          {
            id: 'stem-2',
            fileName: 'bass.wav',
            category: 'bass',
            tag: 'synth',
            key: 'C',
            description: 'Bass track',
            presignedUrl: 'https://example.com/mock-bass.wav',
            metadata: {
              duration: 180,
              fileSize: 3145728,
              sampleRate: 44100,
              channels: 2,
              format: 'wav',
            },
            uploadedBy: {
              id: 'user-1',
              username: 'testuser',
            },
            uploadedAt: new Date().toISOString(),
          },
          {
            id: 'stem-3',
            fileName: 'lead.wav',
            category: 'lead',
            tag: 'synth',
            key: 'C',
            description: 'Lead synth track',
            presignedUrl: 'https://example.com/mock-lead.wav',
            metadata: {
              duration: 180,
              fileSize: 4194304,
              sampleRate: 44100,
              channels: 2,
              format: 'wav',
            },
            uploadedBy: {
              id: 'user-1',
              username: 'testuser',
            },
            uploadedAt: new Date().toISOString(),
          },
        ],
        totalStems: 3,
        urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    };
  }

  getMockStemStream(stemId: string) {
    return {
      success: true,
      data: {
        stemId,
        fileName: `mock-stem-${stemId}.wav`,
        presignedUrl: `https://example.com/mock-${stemId}.wav`,
        metadata: {
          duration: 180,
          fileSize: 4194304,
          sampleRate: 44100,
          channels: 2,
          format: 'wav',
        },
        urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    };
  }

  getMockBatchStreams(stemIds: string[]) {
    return {
      success: true,
      data: {
        streams: stemIds.map(stemId => ({
          stemId,
          fileName: `mock-stem-${stemId}.wav`,
          presignedUrl: `https://example.com/mock-${stemId}.wav`,
          metadata: {
            duration: 180,
            fileSize: 4194304,
            sampleRate: 44100,
            channels: 2,
            format: 'wav',
          },
        })),
        urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    };
  }
}
