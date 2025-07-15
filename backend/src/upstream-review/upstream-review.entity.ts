import { StageReviewer } from "src/stage-reviewer/stage-reviewer.entity";
import { Upstream } from "src/upstream/upstream.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('upstream_reviews')
export class UpstreamReview {
    @PrimaryGeneratedColumn('uuid')
    id : string;

    @ManyToOne(() => Upstream, (upstream) => upstream.upstream_reviews, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'upstream_id' })
    upstream : Upstream;

    @ManyToOne(() => StageReviewer, (stageReviewer) => stageReviewer.upstream_reviews)
    @JoinColumn({ name: 'stage_reviewer_id' })
    stage_reviewer : StageReviewer;

    @Column({ type: 'varchar', default: 'pending' })
    status : string;

}