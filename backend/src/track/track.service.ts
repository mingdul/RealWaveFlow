import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from './track.entity';
import { CreateTrackDto } from './dto/createtrackdto';
import { UpdateTrackDto } from './dto/updatetrackdto';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';

@Injectable()
export class TrackService {
    constructor(
        @InjectRepository(Track)
        private trackRepository: Repository<Track>,
        @InjectRepository(TrackCollaborator)
        private trackCollaboratorRepository: Repository<TrackCollaborator>,
    ) {}

    async createTrack(createTrackDto: CreateTrackDto, owner_id: string) {
        const { title,  description, genre, bpm, key_signature, image_url } = createTrackDto;

        const track = this.trackRepository.create({
            title,
            owner_id: { id: owner_id },
            description,
            genre,
            bpm,    
            key_signature,
            image_url,
        });

        await this.trackRepository.save(track);


        console.log('[DEBUG] Track created successfully:', track);
        return { success: true, message: 'Track created successfully', data: track  };
    }


    async updateTrackStatus(trackId: string, status: string) {
        const track = await this.trackRepository.findOne({ where: { id: trackId } });
        if (!track) {
            throw new NotFoundException('Track not found');
        }
  
        track.status = status;
        await this.trackRepository.save(track);
        return { success: true, message: 'Track status updated successfully', data: track };
    }


    async findTrackById(id: string) {
        const track = await this.trackRepository.findOne({
            where: { id },
            relations: ['owner_id', 'collaborators', 'collaborators.user_id'],
        });

        if (!track) {
            throw new NotFoundException('Track not found');
        }

        return { track };
    }

    async findTracksByOwner(ownerId: string) {
        console.log('[DEBUG] findTracksByOwner ownerId:', ownerId);
        const tracks = await this.trackRepository.find({
            where: { owner_id: { id: ownerId }, status: 'producing' },
            order: { updated_date: 'DESC' },
            relations: ['owner_id', 'collaborators', 'collaborators.user_id'],
        });
        console.log('[DEBUG] findTracksByOwner tracks:', tracks);
        // 트랙이 없으면 시드 데이터 생성

        return { success: true, data: { tracks } };
    }

    async findTracksByCollaborator(userId: string) {
        console.log('[DEBUG] findTracksByCollaborator userId:', userId);
        // 사용자가 협업자로 포함된 트랙 조회
        const collaboratorTracks = await this.trackCollaboratorRepository.find({
            where: { user_id: { id: userId } , status: 'producing' },
            relations: ['track_id', 'track_id.owner_id', 'track_id.collaborators', 'track_id.collaborators.user_id'],
        });
        console.log('[DEBUG] findTracksByCollaborator collaboratorTracks:', collaboratorTracks);
        const tracks = collaboratorTracks.map(collab => collab.track_id);
        return { success: true, data: { tracks } };
    }

    async updateTrack(id: string, updateTrackDto: UpdateTrackDto, userId: string) {
        const track = await this.trackRepository.findOne({
            where: { id },
            relations: ['owner_id'],
        });

        if (!track) {
            throw new NotFoundException('Track not found');
        }

        if (track.owner_id.id !== userId) {
            throw new ForbiddenException('You can only update your own tracks');
        }

        Object.assign(track, updateTrackDto);
        await this.trackRepository.save(track);

        return { message: 'Track updated successfully', track };
    }

    async deleteTrack(id: string, userId: string) {
        const track = await this.trackRepository.findOne({
            where: { id },
            relations: ['owner_id'],
        });

        if (!track) {
            throw new NotFoundException('Track not found');
        }

        if (track.owner_id.id !== userId) {
            throw new ForbiddenException('You can only delete your own tracks');
        }

        await this.trackRepository.remove(track);
        return { message: 'Track deleted successfully' };
    }

    async getTrackCollaborators(trackId: string) {
        const track = await this.trackRepository.findOne({
            where: { id: trackId },
            relations: ['collaborators', 'collaborators.user_id'],
        });

        if (!track) {
            throw new NotFoundException('Track not found');
        }

        return {
            success: true,
            message: 'Track collaborators retrieved successfully',
            data: track.collaborators || []
        };
    }


    async isUserInTrack(userId: string, trackId: string): Promise<boolean> {
        const track = await this.trackRepository.findOne({
          where: { id: trackId },
          relations: ['owner_id'],
        });
      
        if (!track) return false;
        if (track.owner_id.id === userId) return true;
      
        const collaborator = await this.trackCollaboratorRepository.findOne({
          where: {
            user_id: { id: userId },
            track_id: { id: trackId },
            status: 'accepted',
          },
        });
      
        return !!collaborator;
      }
      


}
