
import { Stage } from 'src/stage/stage.entity';
import { StageReviewer } from 'src/stage-reviewer/stage-reviewer.entity';
import { Track } from 'src/track/track.entity';
import { TrackCollaborator } from 'src/track_collaborator/track_collaborator.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar', default: null })
  provider: string;

  @Column({ type: 'varchar', default : null })
  provider_id: string;

  @CreateDateColumn({ type: 'date' })
  created_date: Date;

  @OneToMany(() => Track, (track) => track.owner_id)
  ownedTracks: Track[];

  @OneToMany(() => TrackCollaborator, (trackCollaborator) => trackCollaborator.user_id)
  collaboratedTracks: TrackCollaborator[];

  @OneToMany(() => Stage, (stage) => stage.user)
  stages: Stage[];

  @OneToMany(() => StageReviewer, (stageReviewer) => stageReviewer.user)
  stage_reviewers: StageReviewer[]; 
}
