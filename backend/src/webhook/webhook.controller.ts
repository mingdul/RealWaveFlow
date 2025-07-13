import { Body, Controller, Logger, Post } from '@nestjs/common';
import { SqsService } from 'src/sqs/service/sqs.service';
import { StemFileService } from 'src/stem-file/stem-file.service';
import { ChatGateway } from 'src/websocket/websocket.gateway';

@Controller('webhook')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly sqsService: SqsService,
        private readonly stemFileService: StemFileService,
        private readonly chatGateway: ChatGateway,
    ) {}
    
    @Post('hash-check')
    async handleHashCheck(@Body() data: {
        stemId: string;
        userId: string;
        trackId: string;
        filepath: string;
        sessionId: string;
        audio_hash: string;
        timestamp: string;
        original_filename: string;
    }) {
        this.logger.log('웹훅 해시 체크 요청 수신:', data);
        
        try {
            // 중복 검사: trackId, sessionId, audio_hash 세 조건으로 검사
            const isDuplicate = await this.stemFileService.checkDuplicateHash(
                data.trackId,
                data.audio_hash,
                data.sessionId,
            );

            if (isDuplicate) {
                // 중복 있음 시나리오: 파일 삭제 요청 및 클라이언트 알림
                this.logger.log(`중복 해시 발견: ${data.stemId}, 삭제 프로세스 시작`);
                
                try {
                    // Python 마이크로서비스에 파일 삭제 요청
                    await this.stemFileService.requestPythonFileDelete(
                        data.userId,
                        data.trackId,
                        data.stemId,
                        data.filepath,
                        data.audio_hash
                    );
                    
                    this.logger.log(`중복 파일 삭제 요청 전송 완료: ${data.stemId}`);
                    
                    // DB에서 레코드 삭제
                    await this.stemFileService.deleteStemFile(data.stemId);
                    this.logger.log(`DB에서 스템 파일 삭제 완료: ${data.stemId}`);
                    
                } catch (deleteError) {
                    this.logger.error(`중복 파일 삭제 과정 오류: ${data.stemId}`, deleteError);
                }
                
                // 클라이언트에 중복 파일 알림 (sessionId로 특정 클라이언트에게 전송)
                await this.chatGateway.sendFileDuplicateEvent(data.userId, {
                    trackId: data.trackId,
                    fileName: data.original_filename,
                    sessionId: data.sessionId,
                    originalFilePath: data.filepath,
                    duplicateHash: data.audio_hash,
                });
                
                this.logger.log(`중복 파일 웹소켓 이벤트 전송 완료: ${data.stemId}`);
                
            } else {
                // 신규 파일 시나리오: 처리 승인 및 오디오 분석 시작
                this.logger.log(`신규 파일 확인: ${data.stemId}, 처리 승인 프로세스 시작`);
                
                // 클라이언트에 처리 승인 알림 (stem_hash 포함)
                await this.chatGateway.sendProcessingApprovedEvent(data.userId, {
                    trackId: data.trackId,
                    fileName: data.original_filename,
                    sessionId: data.sessionId,
                    stemHash: data.audio_hash,
                    originalFilePath: data.filepath,
                });
                
                this.logger.log(`처리 승인 웹소켓 이벤트 전송 완료: ${data.stemId}`);
                
                // 처리 승인 신호를 보낸 직후, Python에 오디오 분석 요청
                try {
                    const analysisRequest = {
                        userId: data.userId,
                        trackId: data.trackId,
                        stemId: data.stemId,
                        filepath: data.filepath,
                        sessionId: data.sessionId,
                        audio_hash: data.audio_hash,
                        timestamp: new Date().toISOString(),
                        original_filename: data.original_filename,
                    };
                    
                    // Python 마이크로서비스에 오디오 분석 요청
                    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
                    
                    // 비동기 HTTP 요청 (결과를 기다리지 않음)
                    fetch(`${pythonApiUrl}/analyze-audio`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(analysisRequest),
                    }).catch(error => {
                        this.logger.error(`Python API 오디오 분석 요청 실패: ${data.stemId}`, error.message);
                    });
                    
                    this.logger.log(`Python API 오디오 분석 요청 전송: ${data.stemId}`);
                    
                } catch (analysisError) {
                    this.logger.error(`오디오 분석 요청 실패: ${data.stemId}`, analysisError);
                    // 분석 요청 실패해도 처리 승인은 이미 보냈으므로 에러를 던지지 않음
                }
            }
            
            return {
                success: true,
                message: isDuplicate ? '중복 파일 처리 완료' : '신규 파일 처리 승인',
                isDuplicate: isDuplicate,
                stemId: data.stemId,
                audio_hash: data.audio_hash
            };
            
        } catch (error) {
            this.logger.error('해시 검사 실패:', error);
            
            // 오류 발생 시 클라이언트에 에러 알림
            await this.chatGateway.sendFileProcessingError(data.userId, {
                trackId: data.trackId,
                fileName: data.original_filename,
                error: error.message || '알 수 없는 오류',
                stage: 'hash_check',
            });
            
            throw error;
        }
    }

    @Post('completion')
    async handleCompletion(@Body() data: {
        stemId: string;
        userId: string;
        trackId: string;
        status: string;
        result: any;
        timestamp: string;
        original_filename?: string;
        processing_time?: number;
    }) {
        this.logger.log(`작업 완료 알림 수신: ${data.stemId} (상태: ${data.status})`);

        try {
            if (data.status === 'SUCCESS') {
                // 성공 시 데이터베이스 업데이트
                await this.stemFileService.updateProcessingResult(
                    data.stemId,
                    data.result,
                );
                this.logger.log(`작업 완료 처리 성공: ${data.stemId}`);
                
                // 웹소켓으로 처리 완료 알림 전송
                this.chatGateway.sendFileProcessingCompleted(data.userId, {
                    trackId: data.trackId,
                    fileName: data.original_filename || 'Unknown',
                    result: data.result,
                    processingTime: data.processing_time || 0,
                });
                
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
}
