import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { Track } from '../track/track.entity';
import { User } from '../users/user.entity';
import { TrackCollaborator } from '../track_collaborator/track_collaborator.entity';
// import { SqsModule } from 'src/sqs/sqs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, User, TrackCollaborator]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
