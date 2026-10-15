import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { ObjectId } from 'mongoose';
import { NotificationService } from './notification.service';
import { Notifications } from '../../libs/dto/notification/notification';
import { NotificationsInquiry, ReadNotificationsInput } from '../../libs/dto/notification/notification.input';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';

@Resolver()
export class NotificationResolver {
	constructor(private readonly notificationService: NotificationService) {}

	@UseGuards(AuthGuard)
	@Query(() => Notifications)
	public async getNotifications(
		@Args('input') input: NotificationsInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notifications> {
		return await this.notificationService.getNotifications(memberId, input);
	}

	// Polled by the navbar bell
	@UseGuards(AuthGuard)
	@Query(() => Int)
	public async getUnreadNotifications(@AuthMember('_id') memberId: ObjectId): Promise<number> {
		return await this.notificationService.getUnreadNotifications(memberId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Int)
	public async readNotifications(
		@Args('input') input: ReadNotificationsInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<number> {
		return await this.notificationService.readNotifications(memberId, input.ids);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Int)
	public async readAllNotifications(@AuthMember('_id') memberId: ObjectId): Promise<number> {
		return await this.notificationService.readNotifications(memberId);
	}
}
