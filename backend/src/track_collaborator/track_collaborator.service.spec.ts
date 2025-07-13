import { Test, TestingModule } from '@nestjs/testing';
import { TrackCollaboratorService } from './track_collaborator.service';

describe('TrackCollaboratorService', () => {
  let service: TrackCollaboratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrackCollaboratorService],
    }).compile();

    service = module.get<TrackCollaboratorService>(TrackCollaboratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
