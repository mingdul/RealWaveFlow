import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { NotificationService } from './notification.service';
import { ChatGateway } from '../websocket/websocket.gateway';

@Injectable()
export class NotificationGateway {
  private logger = new Logger(NotificationGateway.name);

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
  ) {}

  // ChatGateway를 통해 알림 전송
  async sendNotificationToUser(userId: string, type: string, message: string, data?: any) {
    this.logger.log(`🔔 [NotificationGateway] 📤 Attempting to send "${type}" to user ${userId}`);
    
    // DB에 알림 저장
    let savedNotification;
    try {
      savedNotification = await this.notificationService.create(userId, type, message, data);
      this.logger.log(`🔔 [NotificationGateway] ✅ Notification saved to DB with ID: ${savedNotification.id}`);
    } catch (error) {
      this.logger.error(`🔔 [NotificationGateway] ❌ Failed to save to DB: ${error.message}`);
      return;
    }
    
    // ChatGateway의 서버를 통해 알림 전송
    try {
      const payload = {
        id: savedNotification.id,
        userId: savedNotification.userId,
        type: savedNotification.type,
        message: savedNotification.message,
        data: savedNotification.data,
        isRead: savedNotification.isRead,
        createdAt: savedNotification.createdAt,
      };
      
      this.logger.log(`🔔 [NotificationGateway] 📡 Sending via ChatGateway to user ${userId}`);
      
      // ChatGateway의 server를 사용해서 알림 전송
      if (this.chatGateway && this.chatGateway.server) {
        this.chatGateway.server.to(`user_${userId}`).emit('notification', payload);
        this.logger.log(`🔔 [NotificationGateway] ✅ Notification sent via ChatGateway`);
      } else {
        this.logger.error(`🔔 [NotificationGateway] ❌ ChatGateway server not available`);
      }
      
    } catch (error) {
      this.logger.error(`🔔 [NotificationGateway] ❌ Failed to send via ChatGateway: ${error.message}`);
    }
  }

  // 여러 사용자에게 알림 전송
  async sendNotificationToUsers(userIds: string[], type: string, message: string, data?: any) {
    this.logger.log(`🔔 [NotificationGateway] Sending notification to ${userIds.length} users: "${type}"`);
    
    for (const userId of userIds) {
      await this.sendNotificationToUser(userId, type, message, data);
    }
    
    this.logger.log(`🔔 [NotificationGateway] ✅ Notification sent to all ${userIds.length} users`);
  }
} 