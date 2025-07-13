import { Module } from '@nestjs/common';
import { TrackCollaboratorController } from './track_collaborator.controller';
import { TrackCollaboratorService } from './track_collaborator.service';
import { TrackCollaborator } from './track_collaborator.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackCollaborator]),   
  ],
  controllers: [TrackCollaboratorController],
  providers: [TrackCollaboratorService],
  exports: [TrackCollaboratorService]
})
export class TrackCollaboratorModule {}
