import { Category } from "src/category/category.entity";
import { Upstream } from "src/upstream/upstream.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('stems')
export class Stem {
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

    @ManyToOne(() => Category, (category) => category.stems, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'category_id' })
    category : Category;

    @ManyToOne(()=> Upstream, (upstream)=> upstream.stems, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'upstream_id' })
    upstream : Upstream;    

    @Column({ type: 'timestamp' })
    uploaded_at : Date;
}