import { Track } from "src/track/track.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('invite_link')
export class InviteLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Track, { eager: true })
  track: Track;

  @Column({type: 'varchar', unique: true })
  token: string;

  @Column({ type: 'int', default: 0 })
  uses: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}