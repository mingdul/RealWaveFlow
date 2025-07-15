import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Stage } from "src/stage/stage.entity";
import { Track } from "src/track/track.entity";
import { Stem } from "src/stem/stem.entity";
import { VersionStem } from "src/version-stem/version-stem.entity";

@Entity('guides')
export class Guide {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    mixed_file_path: string;

    @Column({ type: 'varchar' })
    waveform_data_path: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @OneToOne(() => Stage, (stage) => stage.guide, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'stage_id' })
    stage: Stage;

    @ManyToOne(() => Track, (track) => track.guides, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'track_id' })
    track: Track;

    @ManyToMany(() => Stem, (stem) => stem.guides)
    @JoinTable({
        name: 'guide_stems',
        joinColumn: { name: 'guide_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'stem_id', referencedColumnName: 'id' }
    })
    stems: Stem[];

    @ManyToMany(() => VersionStem, (versionStem) => versionStem.guides)
    @JoinTable({
        name: 'guide_version_stems',
        joinColumn: { name: 'guide_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'version_stem_id', referencedColumnName: 'id' }
    })
    version_stems: VersionStem[];
} 