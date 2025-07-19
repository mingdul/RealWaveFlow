import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackCollaborator } from './track_collaborator.entity';
import { CreateTrackCollaboratorDto } from './dto/create-track-collaborator.dto';
import { UpdateTrackCollaboratorDto } from './dto/update-track-collaborator.dto';
import { Track } from '../track/track.entity';

@Injectable()
export class TrackCollaboratorService { 
    constructor(
        @InjectRepository(TrackCollaborator)
        private trackCollaboratorRepository: Repository<TrackCollaborator>,
        @InjectRepository(Track)
        private trackRepository: Repository<Track>,
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

    async findTrackUsersById(trackId: string) {
        // 트랙 정보와 owner 조회
        const track = await this.trackRepository.findOne({
            where: { id: trackId },
            relations: ['owner_id'],
        });

        if (!track) {
            throw new NotFoundException('트랙을 찾을 수 없습니다.');
        }

        // collaborators 조회 (accepted 상태만)
        const collaborators = await this.trackCollaboratorRepository.find({
            where: { 
                track_id: { id: trackId },
                status: 'accepted'
            },
            relations: ['user_id'],
        });

        return {
            success: true,
            data: {
                owner: {
                    id: track.owner_id.id,
                    email: track.owner_id.email,
                    username: track.owner_id.username,
                    image_url: track.owner_id.image_url,
                },
                collaborators: {
                    collaborator: collaborators.map(collab => ({
                        id: collab.user_id.id,
                        email: collab.user_id.email,
                        username: collab.user_id.username,
                        image_url: collab.user_id.image_url,
                    }))
                }
            }
        };
    }
}
