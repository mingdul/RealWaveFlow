import { Category } from "src/category/category.entity";
import { Stage } from "src/stage/stage.entity";
import { Track } from "src/track/track.entity";
import { User } from "src/users/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('version_stems')
export class VersionStem {
    @PrimaryGeneratedColumn('uuid')
    id : string;

    @Column({type : 'int'})
    take : number;

    @Column({ type: 'varchar' })
    file_name : string;

    @Column({ type: 'varchar' })
    stem_hash : string;

    @Column({ type: 'varchar' })
    file_path : string;

    @Column({ type: 'varchar' , default: null})
    key : string;

    @Column({ type: 'varchar' , default: null})
    bpm : string;

    @ManyToOne(() => Category, (category) => category.version_stems, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'category_id' })
    category : Category;

    @Column({ type: 'timestamp' })
    uploaded_at : Date;
    
    @ManyToOne(() => Stage, (stage) => stage.version_stems, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'stage_id' })
    stage : Stage;

    @ManyToOne(() => User, (user) => user.version_stems)
    @JoinColumn({ name: 'user_id' })
    user : User;

    @ManyToOne(() => Track, (track) => track.version_stems)
    @JoinColumn({ name: 'track_id' })
    track : Track;
}