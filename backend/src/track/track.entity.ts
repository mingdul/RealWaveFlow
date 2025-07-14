import { Category } from 'src/category/category.entity';
import { Stage } from 'src/stage/stage.entity';
import { TrackCollaborator } from 'src/track_collaborator/track_collaborator.entity';
import { User } from 'src/users/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { VersionStem } from 'src/version-stem/version-stem.entity';

@Entity('tracks')
export class Track {
    @PrimaryGeneratedColumn('uuid')
    id : string;

    @ManyToOne(() => User, (user) => user.ownedTracks, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'owner_id' })
    owner_id : User;

    @Column({ type: 'varchar' })
    title : string;


    @Column({ type: 'varchar' , nullable: true , default: null})
    image_url : string;

    @Column({ type: 'varchar', default: 'draft' })
    status : string;

    @Column({ type: 'text' , default: null })
    description : string;

    @Column({ type: 'varchar' , default: null })
    genre : string;

    @Column({ type: 'varchar' , default: null })
    bpm : string;

    @Column({ type: 'varchar' , default: null })
    key_signature : string;

    @CreateDateColumn({ name: 'create_date', type: 'timestamp' })
    created_date : Date;

    @UpdateDateColumn({ name: 'updated_date', type: 'timestamp' })
    updated_date : Date;

    @OneToMany(() => Category, (category) => category.track)
    category : Category[];
    
    @OneToMany(() => TrackCollaborator, (trackCollaborator) => trackCollaborator.track_id)
    collaborators: TrackCollaborator[];

    @OneToMany(() => Stage, (stage) => stage.track)
    stages: Stage[];

    @OneToMany(() => VersionStem, (versionStem) => versionStem.track)
    version_stems: VersionStem[];

}
