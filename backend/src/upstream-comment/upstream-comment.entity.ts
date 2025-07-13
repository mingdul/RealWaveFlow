import { Upstream } from "src/upstream/upstream.entity";
import { User } from "src/users/user.entity";
import { Column, PrimaryGeneratedColumn, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity('upstream_comments')
export class UpstreamComment {
    @PrimaryGeneratedColumn('uuid')
    id : string;

    @Column({ type: 'text' })
    comment : string;

    @Column({ type: 'time' })
    time : string;

    @ManyToOne(() => Upstream, (upstream) => upstream.upstream_comments, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'upstream_id' })
    upstream : Upstream;

    @ManyToOne(() => User, (user) => user.upstream_comments, {
        cascade: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    user : User;
}