import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guide } from './guide.entity';
import { GuideService } from './guide.service';
import { GuideController } from './guide.controller';
import { Stage } from 'src/stage/stage.entity';
import { Track } from 'src/track/track.entity';
import { Stem } from 'src/stem/stem.entity';
import { VersionStem } from 'src/version-stem/version-stem.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Guide,
            Stage,
            Track,
            Stem,
            VersionStem
        ])
    ],
    controllers: [GuideController],
    providers: [GuideService],
    exports: [GuideService]
})
export class GuideModule {} 