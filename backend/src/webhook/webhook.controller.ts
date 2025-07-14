import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SqsService } from 'src/sqs/service/sqs.service';
import { StemJobService } from 'src/stem-job/stem-job.service';
import { StageService } from 'src/stage/stage.service';
import { CategoryService } from 'src/category/category.service';
import { ChatGateway } from 'src/websocket/websocket.gateway';

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly stemJobService: StemJobService,
        private readonly stageService: StageService,
        private readonly categoryService: CategoryService,
        private readonly chatGateway: ChatGateway,
    ) {}
    
    @Post('hash-check')
    @ApiOperation({ summary: '해시 체크 웹훅', description: '파일 업로드 후 해시 체크를 처리하는 웹훅입니다.' })
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                stemId: { type: 'string' },
                userId: { type: 'string' },
                trackId: { type: 'string' },
                filepath: { type: 'string' },
                stageId: { type: 'string' },
                audio_hash: { type: 'string' },
                timestamp: { type: 'string' },
                original_filename: { type: 'string' }
            }
        }
    })
    @ApiResponse({ status: 200, description: '해시 체크 처리 성공' })
    @ApiResponse({ status: 400, description: '잘못된 요청' })
    @ApiResponse({ status: 500, description: '서버 내부 오류' })
    async handleHashCheck(@Body() data: {
        stemId: string;
        userId: string;
        trackId: string;
        filepath: string;
        stageId: string;
        audio_hash: string;
        timestamp: string;
        original_filename: string;
    }) {
        this.logger.log('웹훅 해시 체크 요청 수신:', data);
        
        // StemJob 찾기
        const stemJob = await this.stemJobService.findJobById(data.stemId);
        if (!stemJob) {
            this.logger.error(`StemJob을 찾을 수 없습니다: ${data.stemId}`);
            return {
                success: false,
                message: 'StemJob not found',
                stemId: data.stemId,
            };
        }

        // 해시 값을 StemJob에 업데이트
        await this.stemJobService.updateJobWithHash(data.stemId, data.audio_hash);

        // 신규 파일 시나리오: 처리 승인 및 category 생성, 오디오 분석 시작
        this.logger.log(`신규 파일 확인: ${data.stemId}, 처리 승인 프로세스 시작`);
        
        try {
            // 파일명에서 category 이름 추출 (확장자 제거)
            const categoryName = data.original_filename.replace(/\.[^/.]+$/, '');
            
            // Category 생성 (instrument는 파일명을 기본값으로 사용)
            const category = await this.categoryService.createCategory({
                name: categoryName,
                track_id: data.trackId,
                instrument: stemJob.instrument, // 파일명을 instrument로 사용
            });
            
            // StemJob에 category_id 업데이트
            await this.stemJobService.updateJobWithCategoryId(data.stemId, category.data.id);
            
            this.logger.log(`Category 생성 완료: ${category.data.id} (${categoryName})`);
            
        } catch (categoryError) {
            this.logger.error(`Category 생성 실패: ${data.stemId}`, categoryError);
            // Category 생성 실패해도 계속 진행
        }
        
        // 클라이언트에 처리 승인 알림 (stageId 사용)
        await this.chatGateway.sendProcessingApprovedEvent(data.userId, {
            trackId: data.trackId,
            fileName: data.original_filename,
            stageId: data.stageId,
            stemHash: data.audio_hash,
            originalFilePath: data.filepath,
        });
        
        this.logger.log(`처리 승인 웹소켓 이벤트 전송 완료: ${data.stemId}`);
        
        // 오디오 분석 요청
        try {
            await this.stemJobService.sendAudioAnalysisRequest(stemJob, data.userId);
            this.logger.log(`오디오 분석 요청 전송: ${data.stemId}`);
        } catch (analysisError) {
            this.logger.error(`오디오 분석 요청 실패: ${data.stemId}`, analysisError);
        }
    
        return {
            success: true,
            stemId: data.stemId,
            audio_hash: data.audio_hash
        };
    }

    @Post('completion')
    @ApiOperation({ summary: '작업 완료 웹훅', description: '오디오 분석 작업 완료를 처리하는 웹훅입니다.' })
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                stemId: { type: 'string' },
                userId: { type: 'string' },
                trackId: { type: 'string' },
                status: { type: 'string' },
                result: { type: 'object' },
                timestamp: { type: 'string' },
                original_filename: { type: 'string' },
                processing_time: { type: 'number' },
                audio_wave_path: { type: 'string' }
            }
        }
    })
    @ApiResponse({ status: 200, description: '작업 완료 처리 성공' })
    @ApiResponse({ status: 400, description: '잘못된 요청' })
    @ApiResponse({ status: 500, description: '서버 내부 오류' })
    async handleCompletion(@Body() data: {
        stemId: string;
        userId: string;
        trackId: string;
        status: string;
        result: any;
        timestamp: string;
        original_filename?: string;
        processing_time?: number;
        audio_wave_path?: string;
    }) {
        this.logger.log(`작업 완료 알림 수신: ${data.stemId} (상태: ${data.status})`);

        try {
            if (data.status === 'SUCCESS') {
                // 성공 시 audio_wave_path 업데이트 (파형 분석 완료)
                if (data.audio_wave_path) {
                    await this.stemJobService.updateJobWithWavePath(data.stemId, data.audio_wave_path);
                    this.logger.log(`파형 path 업데이트 완료: ${data.stemId} -> ${data.audio_wave_path}`);
                }
                
                // StemJob을 Stem으로 변환 (version-Stem도 동시 생성)
                const stem = await this.stemJobService.convertJobToStem(data.stemId, data.userId);
                
                if (stem) {
                    this.logger.log(`작업 완료 처리 성공: ${data.stemId} -> ${stem.id}`);
                    
                    // 웹소켓으로 처리 완료 알림 전송
                    this.chatGateway.sendFileProcessingCompleted(data.userId, {
                        trackId: data.trackId,
                        fileName: data.original_filename || 'Unknown',
                        result: data.result,
                        processingTime: data.processing_time || 0,
                    });
                } else {
                    this.logger.error(`StemJob을 Stem으로 변환 실패: ${data.stemId}`);
                }
                
            } else {
                // 실패 시 클라이언트에게 오류 알림
                this.logger.error(`작업 완료 실패: ${data.stemId}`);
                
                this.chatGateway.sendFileProcessingError(data.userId, {
                    trackId: data.trackId,
                    fileName: data.original_filename || 'Unknown',
                    error: data.result?.error || '알 수 없는 오류',
                    stage: 'audio_analysis',
                });
            }

            return { 
                status: 'success', 
                message: '완료 알림 처리 완료',
                stemId: data.stemId,
                processedStatus: data.status
            };
            
        } catch (error) {
            this.logger.error(`완료 알림 처리 실패: ${data.stemId}`, error);
            
            // 완료 처리 실패 시 클라이언트에게 오류 알림
            this.chatGateway.sendFileProcessingError(data.userId, {
                trackId: data.trackId,
                fileName: data.original_filename || 'Unknown',
                error: error.message,
                stage: 'completion_handling',
            });
            
            return { 
                status: 'error', 
                message: '완료 알림 처리 실패',
                error: error.message,
                stemId: data.stemId
            };
        }
    }

    @Post('mixing-complete')
    @ApiOperation({ summary: '믹싱 완료 웹훅', description: '믹싱 작업 완료를 처리하는 웹훅입니다.' })
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                stageId: { type: 'string' },
                status: { type: 'string' },
                mixed_file_path: { type: 'string' },
                stem_count: { type: 'number' },
                stem_paths: { type: 'array', items: { type: 'string' } },
                task_id: { type: 'string' },
                processed_at: { type: 'string' }
            }
        }
    })
    @ApiResponse({ status: 200, description: '믹싱 완료 처리 성공' })
    @ApiResponse({ status: 400, description: '잘못된 요청' })
    @ApiResponse({ status: 500, description: '서버 내부 오류' })
    async handleMixingComplete(@Body() data: {
        stageId: string;
        status: string;
        mixed_file_path: string;
        stem_count: number;
        stem_paths: string[];
        task_id: string;
    }) {
        this.logger.log(`믹싱 완료 알림 수신: ${data.stageId} (상태: ${data.status})`);

        try {
            if (data.status === 'completed') {
                // 성공 시 stage의 guide_path 업데이트
                const updatedStage = await this.stageService.updateGuidePath(
                    data.stageId,
                    data.mixed_file_path
                );

                this.logger.log(`믹싱 완료 처리 성공: ${data.stageId} -> ${data.mixed_file_path}`);

                return {
                    status: 'success',
                    message: '믹싱 완료 처리 성공',
                    stageId: data.stageId,
                    mixedFilePath: data.mixed_file_path
                };
            } else {
                this.logger.error(`믹싱 완료 실패: ${data.stageId}`);
                return {
                    status: 'error',
                    message: '믹싱 완료 실패',
                    stageId: data.stageId
                };
            }
        } catch (error) {
            this.logger.error(`믹싱 완료 처리 실패: ${data.stageId}`, error);
            return {
                status: 'error',
                message: '믹싱 완료 처리 실패',
                error: error.message,
                stageId: data.stageId
            };
        }
    }
}
