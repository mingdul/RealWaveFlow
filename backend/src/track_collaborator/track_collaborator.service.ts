import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackCollaborator } from './track_collaborator.entity';
import { CreateTrackCollaboratorDto } from './dto/create-track-collaborator.dto';
import { UpdateTrackCollaboratorDto } from './dto/update-track-collaborator.dto';
import { SetRoleDto } from './dto/set-role.dto';
import { Track } from '../track/track.entity';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class TrackCollaboratorService { 
    private readonly s3 = new S3Client({
        region: process.env.AWS_REGION,
    });
    
    private readonly bucketName = process.env.AWS_S3_BUCKET_NAME || 'waveflow-bucket';

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

    private async generatePresignedUrl(imageKey: string): Promise<string | null> {
        if (!imageKey) {
            return null;
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: imageKey,
            });

            const presignedUrl = await getSignedUrl(this.s3, command, {
                expiresIn: 3600 // 1시간
            });

            return presignedUrl;
        } catch (error) {
            console.error('Error generating presigned URL for key:', imageKey, error);
            return null;
        }
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

        // Owner 이미지 presigned URL 생성
        const ownerImageUrl = await this.generatePresignedUrl(track.owner_id.image_url);

        // Collaborators 이미지 presigned URLs 생성
        const collaboratorsWithPresignedUrls = await Promise.all(
            collaborators.map(async (collab) => {
                const collaboratorImageUrl = await this.generatePresignedUrl(collab.user_id.image_url);
                return {
                    id: collab.user_id.id,
                    email: collab.user_id.email,
                    username: collab.user_id.username,
                    image_url: collaboratorImageUrl,
                    role: collab.role,
                };
            })
        );

        return {
            success: true,
            data: {
                owner: {
                    id: track.owner_id.id,
                    email: track.owner_id.email,
                    username: track.owner_id.username,
                    image_url: ownerImageUrl,
                },
                collaborators: {
                    collaborator: collaboratorsWithPresignedUrls
                }
            }
        };
    }

    async setRole(setRoleDto: SetRoleDto, currentUserId: string) {
        const { userId, trackId, role } = setRoleDto;

        // 트랙 정보와 owner 조회
        const track = await this.trackRepository.findOne({
            where: { id: trackId },
            relations: ['owner_id'],
        });

        if (!track) {
            throw new NotFoundException('트랙을 찾을 수 없습니다.');
        }

        // 현재 사용자가 트랙의 owner인지 확인
        if (track.owner_id.id !== currentUserId) {
            throw new ForbiddenException('접근 권한이 없습니다.');
        }

        // 해당 유저의 협업자 관계 조회
        const collaborator = await this.trackCollaboratorRepository.findOne({
            where: { 
                user_id: { id: userId },
                track_id: { id: trackId }
            },
            relations: ['user_id', 'track_id'],
        });

        if (!collaborator) {
            throw new NotFoundException('협업자를 찾을 수 없습니다.');
        }

        // role 업데이트
        collaborator.role = role;
        await this.trackCollaboratorRepository.save(collaborator);

        return {
            success: true,
            message: 'Role updated successfully',
            collaborator
        };
    }

    async isOwner(trackId: string, currentUserId: string) {
        const track = await this.trackRepository.findOne({
            where: { id: trackId },
            relations: ['owner_id'],
        });

        if (!track) {
            throw new NotFoundException('트랙을 찾을 수 없습니다.');
        }

        const isOwner = track.owner_id.id === currentUserId;

        return {
            success: true,
            isOwner
        };
    }
}
