import { StageReviewer } from "src/stage-reviewer/stage-reviewer.entity";
import { Track } from "src/track/track.entity";
import { Upstream } from "src/upstream/upstream.entity";
import { User } from "src/users/user.entity";
import { VersionStem } from "src/version-stem/version-stem.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('stages')
export class Stage {
    @PrimaryGeneratedColumn('uuid')
    id : string;

    @Column({ type: 'varchar' })
    title: string;

    @Column({ type: 'text' })
    description : string;

    @Column({ type: 'int' })
    take : number;

    @Column({ type: 'varchar', default: 'active' })
    status : string;

    @Column({ type: 'varchar', nullable: true , default: null})
    guide_path : string;

    @ManyToOne(() => Track, (track) => track.stages,{
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'track_id' })
    track : Track;

    @ManyToOne(() => User, (user) => user.stages)
    @JoinColumn({ name: 'user_id' })
    user : User;

    @Column({ type: 'timestamp' })
    created_at : Date;

    @OneToMany(() => StageReviewer, (stageReviewer) => stageReviewer.stage)
    stage_reviewers : StageReviewer[];

    @OneToMany(() => VersionStem, (versionStem) => versionStem.stage)
    version_stems : VersionStem[];

    @OneToMany(() => Upstream, (upstream) => upstream.stage)
    upstreams : Upstream[];
}
