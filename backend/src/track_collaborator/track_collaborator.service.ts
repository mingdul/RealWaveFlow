import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackCollaborator } from './track_collaborator.entity';
import { CreateTrackCollaboratorDto } from './dto/create-track-collaborator.dto';
import { UpdateTrackCollaboratorDto } from './dto/update-track-collaborator.dto';

@Injectable()
export class TrackCollaboratorService { 
    constructor(
        @InjectRepository(TrackCollaborator)
        private trackCollaboratorRepository: Repository<TrackCollaborator>,
    ) {}

    async createCollaborator(createTrackCollaboratorDto: CreateTrackCollaboratorDto) {
        const { track_id, user_id, status = 'pending' } = createTrackCollaboratorDto;

        // 이미 존재하는 협업자 관계인지 확인
        const existingCollaborator = await this.trackCollaboratorRepository.findOne({
            where: { track_id: { id: track_id }, user_id: { id: user_id } },
        });

        if (existingCollaborator) {
            throw new ConflictException('Collaborator relationship already exists');
        }

        const collaborator = this.trackCollaboratorRepository.create({
            track_id: { id: track_id },
            user_id: { id: user_id },
            status,
        });

        await this.trackCollaboratorRepository.save(collaborator);
        return { message: 'Collaborator added successfully', collaborator };
    }


    async findCollaboratorsByTrack(trackId: string) {
        const collaborators = await this.trackCollaboratorRepository.find({
            where: { track_id: { id: trackId } },
            relations: ['track_id', 'user_id'],
        });
        return { collaborators };
    }

    async findCollaboratorsByUser(userId: string) {
        const collaborators = await this.trackCollaboratorRepository.find({
            where: { user_id: { id: userId } },
            relations: ['track_id', 'user_id'],
        });
        return { collaborators };
    }


    async updateCollaborator(id: string, updateTrackCollaboratorDto: UpdateTrackCollaboratorDto) {
        const collaborator = await this.trackCollaboratorRepository.findOne({
            where: { id },
            relations: ['track_id', 'user_id'],
        });

        if (!collaborator) {
            throw new NotFoundException('Collaborator not found');
        }

        Object.assign(collaborator, updateTrackCollaboratorDto);
        await this.trackCollaboratorRepository.save(collaborator);

        return {success: true, message: 'Collaborator updated successfully', collaborator };
    }

    async deleteCollaborator(id: string) {
        const collaborator = await this.trackCollaboratorRepository.findOne({
            where: { id },
        });

        if (!collaborator) {
            throw new NotFoundException('Collaborator not found');
        }

        await this.trackCollaboratorRepository.remove(collaborator);
        return { success: true, message: 'Collaborator removed successfully' };
    }

    async acceptCollaboration(id: string) {
        const collaborator = await this.trackCollaboratorRepository.findOne({
            where: { id },
            relations: ['track_id', 'user_id'],
        });

        if (!collaborator) {
            throw new NotFoundException('Collaborator not found');
        }

        collaborator.status = 'accepted';
        await this.trackCollaboratorRepository.save(collaborator);

        return { message: 'Collaboration accepted successfully', collaborator };
    }

    async rejectCollaboration(id: string) {
        const collaborator = await this.trackCollaboratorRepository.findOne({
            where: { id },
            relations: ['track_id', 'user_id'],
        });

        if (!collaborator) {
            throw new NotFoundException('Collaborator not found');
        }

        collaborator.status = 'rejected';
        await this.trackCollaboratorRepository.save(collaborator);

        return { message: 'Collaboration rejected successfully', collaborator };
    }
}
