import { Module } from '@nestjs/common';
import { TrackController } from './track.controller';
import { TrackService } from './track.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Track, TrackCollaborator])],
  controllers: [TrackController],
  providers: [TrackService],
  exports: [TrackService, TypeOrmModule],
})
export class TrackModule {}
