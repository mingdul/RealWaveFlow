import { Body, Controller, Post, Param, Get, Logger, UseGuards, Req, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { StemJobService } from './stem-job.service';
import { StageService } from '../stage/stage.service';
import { TrackService } from '../track/track.service';
import { CreateStemJobDto } from './dto/createStemJob.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('stem-job')
@ApiBearerAuth()
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
  @ApiOperation({ summary: '트랙 및 스테이지 초기화', description: '새로운 트랙과 스테이지를 동시에 생성합니다.' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        genre: { type: 'string' },
        bpm: { type: 'string' },
        key_signature: { type: 'string' },
        image_url: { type: 'string' },
        stage_title: { type: 'string' },
        stage_description: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 201, description: '트랙 및 스테이지 초기화 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
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
        track_id: track.data.id,
        user_id: req.user.id,
        status : 'done',
      });
      
      this.logger.log(`Stage 생성 완료: ${stage.data.id}`);
      
      return {
        success: true,
        message: 'Track and Stage initialized successfully',
        data: {
          track: track.data,
          stage: stage.data,
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
  @ApiOperation({ summary: '스템 작업 생성', description: '새로운 스템 작업을 생성합니다.' })
  @ApiBody({ type: CreateStemJobDto })
  @ApiResponse({ status: 201, description: '스템 작업 생성 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async createStemJob(@Body() createStemJobDto: CreateStemJobDto , @Request() req) {
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
  @ApiOperation({ summary: '트랙별 스템 작업 조회', description: '특정 트랙의 모든 스템 작업을 조회합니다.' })
  @ApiParam({ name: 'track_id', description: '트랙 ID' })
  @ApiResponse({ status: 200, description: '스템 작업 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
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
  @ApiOperation({ summary: '믹싱 요청 - init', description: '스테이지의 믹싱- init를 요청합니다.' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        stageId: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 200, description: ' init 믹싱  요청 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '스테이지를 찾을 수 없음' })
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
      this.logger.error('믹싱 요청 실패:', error);
      return {
        success: false,
        message: 'Failed to send mixing initialization request',
        error: error.message,
      };
    }
  }

  @Post('request-mixing') // 나중에 init 말고 add 할때 쓸예정
  @ApiOperation({ summary: '믹싱 요청', description: '스테이지의 스템들을 믹싱합니다.' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        stageId: { type: 'string' },
        stem_paths: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  @ApiResponse({ status: 200, description: '믹싱 요청 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '스테이지를 찾을 수 없음' })
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
