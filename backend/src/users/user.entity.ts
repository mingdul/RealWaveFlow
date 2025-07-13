
import { Stage } from 'src/stage/stage.entity';
import { StageReviewer } from 'src/stage-reviewer/stage-reviewer.entity';
import { Track } from 'src/track/track.entity';
import { TrackCollaborator } from 'src/track_collaborator/track_collaborator.entity';
import { Upstream } from 'src/upstream/upstream.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { UpstreamComment } from 'src/upstream-comment/upstream-comment.entity';
import { VersionStem } from 'src/version-stem/version-stem.entity';


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

  @OneToMany(() => Upstream, (upstream) => upstream.user)
  upstreams: Upstream[];

  @OneToMany(() => UpstreamComment, (upstreamComment) => upstreamComment.user)
  upstream_comments: UpstreamComment[];

  @OneToMany(() => VersionStem, (versionStem) => versionStem.user)
  version_stems: VersionStem[];
}
