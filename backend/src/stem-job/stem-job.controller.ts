import { Body, Controller, Post, Param, Get, Logger, UseGuards, Req, Request } from '@nestjs/common';
import { StemJobService } from './stem-job.service';
import { StageService } from '../stage/stage.service';
import { TrackService } from '../track/track.service';
import { CreateStemJobDto } from './dto/createStemJob.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('stem-job')
export class StemJobController {
  private readonly logger = new Logger(StemJobController.name);
  
  constructor(
    private readonly stemJobService: StemJobService,
    private readonly stageService: StageService,
    private readonly trackService: TrackService,
  ) {}

  @Post('init-start')
  async initStart(@Body() initData: {
    // Track 생성 데이터
    title: string;
    description?: string;
    genre?: string;
    bpm?: string;
    key_signature?: string;
    image_url?: string;
    
    // Stage 생성 데이터
    stage_title: string;
    stage_description: string;
    version: number;
  }, @Request() req) {
    try {
      // 1. Track 생성
      const track = await this.trackService.createTrack({
        title: initData.title,
        description: initData.description || '',
        genre: initData.genre || '',
        bpm: initData.bpm || '',
        key_signature: initData.key_signature || '',
        image_url: initData.image_url || '',
      }, req.user.id);
      
      this.logger.log(`Track 생성 완료: ${track.data.id}`);
      
      // 2. Stage 생성
      const stage = await this.stageService.createStage({
        title: initData.stage_title,
        description: initData.stage_description,
        version: initData.version,
        track_id: track.data.id,
        user_id: req.user.id,
        status : 'approve',
      });
      
      this.logger.log(`Stage 생성 완료: ${stage.stage.id}`);
      
      return {
        success: true,
        message: 'Track and Stage initialized successfully',
        data: {
          track: track.data,
          stage: stage.stage,
        },
      };
    } catch (error) {
      this.logger.error('Track 및 Stage 초기화 실패:', error);
      return {
        success: false,
        message: 'Failed to initialize track and stage',
        error: error.message,
      };
    }
  }

  @Post('create')
  async createStemJob(@Body() createStemJobDto: CreateStemJobDto & {
    upstream_id?: string;
    stage_id: string;
    track_id: string;
  }, @Request() req) {
    try {
      const job = await this.stemJobService.createJob(createStemJobDto, req.user.id);
      return {
        success: true,
        message: 'Stem job created successfully',
        job,
      };
    } catch (error) {
      this.logger.error('스템 작업 생성 실패:', error);
      return {
        success: false,
        message: 'Failed to create stem job',
        error: error.message,
      };
    }
  }

  @Get('/track/:track_id')
  async getTrackJobs(@Param('track_id') trackId: string) {
    try {
      const jobs = await this.stemJobService.findJobsByTrackId(trackId);
      return {
        success: true,
        message: 'Stem jobs fetched successfully',
        jobs,
      };
    } catch (error) {
      this.logger.error('스템 작업 조회 실패:', error);
      return {
        success: false,
        message: 'Failed to fetch stem jobs',
        error: error.message,
      };
    }
  }

  @Post('request-mixing-init')
  async requestMixingInit(@Body() requestData: {
    stageId: string;
  }) {
    try {
      await this.stageService.requestStemMixingByStageId(requestData.stageId);
      return {
        success: true,
        message: 'Mixing initialization request sent successfully',
        stageId: requestData.stageId,
      };
    } catch (error) {
      this.logger.error('믹싱 초기화 요청 실패:', error);
      return {
        success: false,
        message: 'Failed to send mixing initialization request',
        error: error.message,
      };
    }
  }

  @Post('request-mixing') // 나중에 init 말고 add 할때 쓸예정
  async requestMixing(@Body() requestData: {
    stageId: string;
    stem_paths: string[];
  }) {
    try {
      await this.stageService.requestStemMixing(requestData.stageId, requestData.stem_paths);
      return {
        success: true,
        message: 'Mixing request sent successfully',
        stageId: requestData.stageId,
        stemCount: requestData.stem_paths.length,
      };
    } catch (error) {
      this.logger.error('믹싱 요청 실패:', error);
      return {
        success: false,
        message: 'Failed to send mixing request',
        error: error.message,
      };
    }
  }
}
