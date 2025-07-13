import { Stage } from "src/stage/stage.entity";
import { UpstreamReview } from "src/upstream-review/upstream-review.entity";
import { User } from "src/users/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany,  PrimaryGeneratedColumn } from "typeorm";

@Entity('stage_reviewers')
export class StageReviewer {
    @PrimaryGeneratedColumn('uuid')
    id : string;

    @ManyToOne(() => Stage, (stage) => stage.stage_reviewers)
    @JoinColumn({ name: 'stage_id' })
    stage : Stage;

    @ManyToOne(() => User, (user) => user.stage_reviewers, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    user : User;

    @OneToMany(() => UpstreamReview, (upstreamReview) => upstreamReview.stage_reviewer)
    upstream_reviews : UpstreamReview[];
}