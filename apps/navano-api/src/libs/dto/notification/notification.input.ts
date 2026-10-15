import { Field, InputType, Int } from '@nestjs/graphql';
import { ArrayMaxSize, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';
import type { ObjectId } from 'mongoose';
import { NotificationGroup, NotificationStatus, NotificationType } from '../../enums/notification.enum';

@InputType()
export class NotificationsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page!: number;

	@IsNotEmpty()
	@Min(1)
	@Max(50)
	@Field(() => Int)
	limit!: number;

	@IsOptional()
	@Field(() => NotificationStatus, { nullable: true })
	notificationStatus?: NotificationStatus;
}

@InputType()
export class ReadNotificationsInput {
	@IsNotEmpty()
	@ArrayMaxSize(50)
	@Field(() => [String])
	ids!: string[];
}

// Internal: what the other services pass to NotificationService.notify()
export interface NotifyInput {
	notificationType: NotificationType;
	notificationGroup: NotificationGroup;
	notificationTitle: string;
	notificationDesc?: string;
	authorId: ObjectId;
	receiverId: ObjectId;
	productId?: ObjectId;
	articleId?: ObjectId;
}
