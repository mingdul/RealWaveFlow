import { Module } from '@nestjs/common';
import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteLink } from './invite.entity';
import { InviteBatch } from './invite-batch.entity';
import { InviteTarget } from './invite-target.entity';
import { Track } from 'src/track/track.entity';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';
import { User } from '../users/user.entity';
import { Session } from '../session/session.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InviteLink,
      InviteBatch,
      InviteTarget,
      Track,
      TrackCollaborator,
      User,
      Session
    ]),
    EmailModule
  ],
  controllers: [InviteController],
  providers: [InviteService],
  exports: [InviteService]
})
export class InviteModule {}
