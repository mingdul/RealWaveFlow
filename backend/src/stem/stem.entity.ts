import { Category } from "src/category/category.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('stems')
export class Stem {
    @PrimaryGeneratedColumn('uuid')
    id : string;

    @Column({ type: 'varchar' })
    file_name : string;

    @Column({ type: 'varchar' })
    stem_type : string;

    @Column({ type: 'varchar' })
    file_path : string;

    @Column({ type: 'varchar' })
    key : string;

    @Column({ type: 'varchar' })
    bpm : string;

    @ManyToOne(() => Category, (category) => category.stems, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'category_id' })
    category : Category;
    
    

}