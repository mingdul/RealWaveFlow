import { Stem } from "src/stem/stem.entity";
import { Track } from "src/track/track.entity";
import { VersionStem } from "src/version-stem/version-stem.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('category')
export class Category {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Track, (track) => track.category, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'track_id' })
    track: Track;

    @Column({ type: 'varchar' })
    name: string;


    @Column({ type: 'varchar' })
    instrument: string;

    @OneToMany(() => Stem, (stem) => stem.category)
    stems : Stem[];

    @OneToMany(() => VersionStem, (versionStem) => versionStem.category)
    version_stems : VersionStem[];
}
