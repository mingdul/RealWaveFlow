import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('stem_jobs')
export class StemJob {
    @PrimaryGeneratedColumn('uuid')
    id : string;

    @Column({ type: 'varchar' })
    file_name : string;

    @Column({ type: 'varchar' , default: null})
    stem_hash : string;

    @Column({ type: 'varchar' , default: null})
    file_path : string;

    @Column({ type: 'varchar' , default: null})
    key : string;

    @Column({ type: 'varchar' , default: null})
    bpm : string;

    @Column({ name: 'category_id', nullable: true , default: null})
    category_id : string;

    @Column({ name: 'upstream_id' , nullable: true , default: null})
    upstream_id : string;    

    @Column({ type: 'timestamp' })
    uploaded_at : Date;
}