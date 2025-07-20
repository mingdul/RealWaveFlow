import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackCollaborator } from './track_collaborator.entity';
import { CreateTrackCollaboratorDto } from './dto/create-track-collaborator.dto';
import { UpdateTrackCollaboratorDto } from './dto/update-track-collaborator.dto';
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

    // 기존 데이터 마이그레이션: 모든 트랙 owner를 TrackCollaborator에 추가
    async migrateOwnersToCollaborators() {
        const tracks = await this.trackRepository.find({
            relations: ['owner_id'],
        });

        const migratedCount = 0;
        
        for (const track of tracks) {
            // 이미 owner가 collaborator로 등록되어 있는지 확인
            const existingOwnerCollaborator = await this.trackCollaboratorRepository.findOne({
                where: { 
                    track_id: { id: track.id }, 
                    user_id: { id: track.owner_id.id },
                    is_owner: true
                },
            });

            if (!existingOwnerCollaborator) {
                const ownerCollaborator = this.trackCollaboratorRepository.create({
                    track_id: { id: track.id },
                    user_id: { id: track.owner_id.id },
                    status: 'accepted',
                    is_owner: true,
                });

                await this.trackCollaboratorRepository.save(ownerCollaborator);
            }
        }

        return { message: `Migration completed. ${tracks.length} tracks processed.` };
    }

    // 역할 설정 (owner만 가능)
    async updateUserRole(trackId: string, userId: string, role: string, requestUserId: string) {
        // 요청자가 트랙 owner인지 확인
        const requestUserCollaborator = await this.trackCollaboratorRepository.findOne({
            where: { 
                track_id: { id: trackId }, 
                user_id: { id: requestUserId },
                is_owner: true
            },
        });

        if (!requestUserCollaborator) {
            throw new ConflictException('Only track owner can update roles');
        }

        // 대상 유저 찾기
        const targetCollaborator = await this.trackCollaboratorRepository.findOne({
            where: { 
                track_id: { id: trackId }, 
                user_id: { id: userId }
            },
            relations: ['user_id'],
        });

        if (!targetCollaborator) {
            throw new NotFoundException('User is not a collaborator of this track');
        }

        // 역할 업데이트
        targetCollaborator.role = role;
        await this.trackCollaboratorRepository.save(targetCollaborator);

        return { 
            success: true, 
            message: 'Role updated successfully', 
            data: {
                userId: targetCollaborator.user_id.id,
                username: targetCollaborator.user_id.username,
                role: targetCollaborator.role
            }
        };
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
        // 모든 트랙 참여자 조회 (owner + collaborators, accepted 상태만)
        const allCollaborators = await this.trackCollaboratorRepository.find({
            where: { 
                track_id: { id: trackId },
                status: 'accepted'
            },
            relations: ['user_id'],
        });

        if (allCollaborators.length === 0) {
            throw new NotFoundException('트랙을 찾을 수 없습니다.');
        }

        // Owner와 일반 collaborators 분리
        const ownerCollab = allCollaborators.find(collab => collab.is_owner);
        const regularCollaborators = allCollaborators.filter(collab => !collab.is_owner);

        // Owner 데이터 생성
        let ownerData = null;
        if (ownerCollab) {
            const ownerImageUrl = await this.generatePresignedUrl(ownerCollab.user_id.image_url);
            ownerData = {
                id: ownerCollab.user_id.id,
                email: ownerCollab.user_id.email,
                username: ownerCollab.user_id.username,
                image_url: ownerImageUrl,
                role: ownerCollab.role,
            };
        }

        // Collaborators 데이터 생성
        const collaboratorsWithPresignedUrls = await Promise.all(
            regularCollaborators.map(async (collab) => {
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
                owner: ownerData,
                collaborators: {
                    collaborator: collaboratorsWithPresignedUrls
                }
            }
        };
    }
}
