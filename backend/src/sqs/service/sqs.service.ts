import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Injectable, Logger } from "@nestjs/common";


@Injectable()
export class SqsService {
    private readonly logger = new Logger(SqsService.name);
    private readonly sqsClient : SQSClient;
    private readonly queueUrl = process.env.MY_QUEUE_URL;

    constructor(){
        this.sqsClient = new SQSClient({
            region: process.env.AWS_REGION,
        });
    }

    // 해시 생성 요청
    async sendHashGenerationRequest(data: {
        userId: string;
        trackId: string;
        stemId: string;
        filepath: string;
        timestamp: string;
        original_filename: string;
      }) {
        const message = {
          task: 'app.tasks.generate_hash_and_webhook',
          id: `hash-${data.stemId}-${Date.now()}`,
          args: [],
          kwargs: {
            userId: data.userId,
            trackId: data.trackId,
            stemId: data.stemId,
            filepath: data.filepath,
            timestamp: data.timestamp,
            original_filename: data.original_filename,
          },
        };
    
        try {
          const command = new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify(message),
          });
    
          const result = await this.sqsClient.send(command);
          this.logger.log(`해시 생성 요청 전송: ${data.stemId}`);
          return result;
        } catch (error) {
          this.logger.error('SQS 메시지 전송 실패:', error);
          throw error;
        }
    }

    // 중복 파일 처리 요청
    async sendDuplicateFileRequest(data: {
        userId: string;
        trackId: string;
        stemId: string;
        filepath: string;
        audio_hash: string;
      }) {
        const message = {
          task: 'app.tasks.process_duplicate_file',
          id: `duplicate-${data.stemId}-${Date.now()}`,
          args: [],
          kwargs: {
            userId: data.userId,
            trackId: data.trackId,
            stemId: data.stemId,
            filepath: data.filepath,
            audio_hash: data.audio_hash,
          },
        };
    
        try {
          const command = new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify(message),
          });
    
          const result = await this.sqsClient.send(command);
          this.logger.log(`중복 파일 처리 요청 전송: ${data.stemId}`);
          return result;
        } catch (error) {
          this.logger.error('SQS 메시지 전송 실패:', error);
          throw error;
        }
      }
    
    // 오디오 분석 요청
    async sendAudioAnalysisRequest(data: {
        userId: string;
        trackId: string;
        stemId: string;
        filepath: string;
        audio_hash: string;
        timestamp: string;
        original_filename: string;
      }) {
        const message = {
          task: 'app.tasks.process_audio_analysis',
          id: `analysis-${data.stemId}-${Date.now()}`,
          args: [],
          kwargs: {
            userId: data.userId,
            trackId: data.trackId,
            stemId: data.stemId,
            filepath: data.filepath,
            audio_hash: data.audio_hash,
            timestamp: data.timestamp,
            original_filename: data.original_filename,
            num_peaks: 4000,
          },
        };
    
        try {
          const command = new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify(message),
          });
    
          const result = await this.sqsClient.send(command);
          this.logger.log(`오디오 분석 요청 전송: ${data.stemId}`);
          return result;
        } catch (error) {
          this.logger.error('SQS 메시지 전송 실패:', error);
          throw error;
        }
    }
}
