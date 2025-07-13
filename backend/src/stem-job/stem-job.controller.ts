import { Body, Controller, Post, Param, Get, Logger, UseGuards, Req, Request } from '@nestjs/common';
import { StemJobService } from './stem-job.service';
import { StageService } from '../stage/stage.service';
import { CreateStemJobDto } from './dto/createStemJob.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('stem-job')
export class StemJobController {
  private readonly logger = new Logger(StemJobController.name);
  
  constructor(
    private readonly stemJobService: StemJobService,
    private readonly stageService: StageService,
  ) {}

  @Post('create')
  async createStemJob(@Body() createStemJobDto: CreateStemJobDto & {
    category_id: string;
    upstream_id: string;
    stage_id: string;
    track_id: string;
  }, @Request() req) {
    try {
      const job = await this.stemJobService.createJob(createStemJobDto, req.userid);
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

  @Post('request-mixing')
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
