import { Track } from "src/track/track.entity";
import { User } from "src/users/user.entity";
import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('track_collaborators')
export class TrackCollaborator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user_id: User;

  @ManyToOne(() => Track, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'track_id' })
  track_id: Track;

  @Column({ default: 'accepted' }) // 상태: pending, accepted 등
  status: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  role?: string;

  @Column({ type: 'boolean', default: false })
  is_owner: boolean;
}