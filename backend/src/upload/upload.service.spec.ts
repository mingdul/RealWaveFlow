import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadService],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateChunkSize', () => {
    it('should return 10MB for files smaller than 100MB', () => {
      const fileSize = 50 * 1024 * 1024; // 50MB
      const chunkSize = service['calculateChunkSize'](fileSize);
      expect(chunkSize).toBe(10 * 1024 * 1024); // 10MB
    });

    it('should return 25MB for files between 100MB and 500MB', () => {
      const fileSize = 200 * 1024 * 1024; // 200MB
      const chunkSize = service['calculateChunkSize'](fileSize);
      expect(chunkSize).toBe(25 * 1024 * 1024); // 25MB
    });

    it('should return 50MB for files larger than 500MB', () => {
      const fileSize = 600 * 1024 * 1024; // 600MB
      const chunkSize = service['calculateChunkSize'](fileSize);
      expect(chunkSize).toBe(50 * 1024 * 1024); // 50MB
    });
  });

  describe('generateS3Key', () => {
    it('should generate correct S3 key format', () => {
      const userId = 'user123';
      const projectId = 'project456';
      const filename = 'test.wav';
      
      const key = service['generateS3Key'](userId, projectId, filename);
      expect(key).toBe('users/user123/projects/project456/stems/test.wav');
    });
  });
}); 