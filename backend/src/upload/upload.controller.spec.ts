import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

describe('UploadController', () => {
  let controller: UploadController;
  let service: UploadService;

  const mockUploadService = {
    initUpload: jest.fn(),
    getPresignedUrls: jest.fn(),
    completeUpload: jest.fn(),
    abortUpload: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    service = module.get<UploadService>(UploadService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initUpload', () => {
    it('should call uploadService.initUpload with correct parameters', async () => {
      const dto = {
        projectId: 'test-project',
        filename: 'test.wav',
        contentType: 'audio/wav',
        fileSize: 1024000,
      };
      const req = { user: { id: 'user123' } };
      const expectedResult = {
        uploadId: 'test-upload-id',
        key: 'test-key',
        chunkSize: 10485760,
      };

      mockUploadService.initUpload.mockResolvedValue(expectedResult);

      const result = await controller.initUpload(dto, req);

      expect(service.initUpload).toHaveBeenCalledWith(dto, 'user123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getPresignedUrls', () => {
    it('should call uploadService.getPresignedUrls with correct parameters', async () => {
      const dto = {
        uploadId: 'test-upload-id',
        key: 'test-key',
        projectId: 'test-project',
        parts: [{ partNumber: 1 }],
      };
      const req = { user: { id: 'user123' } };
      const expectedResult = {
        urls: [{ partNumber: 1, url: 'https://example.com/presigned-url' }],
      };

      mockUploadService.getPresignedUrls.mockResolvedValue(expectedResult);

      const result = await controller.getPresignedUrls(dto, req);

      expect(service.getPresignedUrls).toHaveBeenCalledWith(dto, 'user123');
      expect(result).toEqual(expectedResult);
    });
  });
});
