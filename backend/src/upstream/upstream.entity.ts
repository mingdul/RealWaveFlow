import { Stage } from "src/stage/stage.entity";
import { Stem } from "src/stem/stem.entity";
import { UpstreamComment } from "src/upstream-comment/upstream-comment.entity";
import { UpstreamReview } from "src/upstream-review/upstream-review.entity";
import { User } from "src/users/user.entity";
import { Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { Column } from "typeorm";
import { PrimaryGeneratedColumn } from "typeorm";

@Entity('upstreams')
export class Upstream {
    @PrimaryGeneratedColumn('uuid')
    id : string;

    @Column({ type: 'varchar' })
    title : string;

    @Column({ type: 'text' })
    description : string;

    @Column({ type: 'varchar' })
    status : string;

    @Column({ type: 'varchar', nullable: true , default: null})
    guide_path : string;

    @Column({ type: 'timestamp' })
    created_at : Date;

    
    @ManyToOne(() => Stage, (stage) => stage.upstreams, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'stage_id' })
    stage : Stage;

    @ManyToOne(() => User, (user) => user.upstreams)
    @JoinColumn({ name: 'user_id' })
    user : User;

    @OneToMany(() => UpstreamComment, (upstreamComment) => upstreamComment.upstream)
    upstream_comments: UpstreamComment[];

    @OneToMany(() => Stem, (stem) => stem.upstream)
    stems: Stem[];

    @OneToMany(() => UpstreamReview, (upstreamReview) => upstreamReview.upstream)
    upstream_reviews: UpstreamReview[];
    
}