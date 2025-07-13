import { Test, TestingModule } from '@nestjs/testing';
import { TrackCollaboratorController } from './track_collaborator.controller';

describe('TrackCollaboratorController', () => {
  let controller: TrackCollaboratorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackCollaboratorController],
    }).compile();

    controller = module.get<TrackCollaboratorController>(TrackCollaboratorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
