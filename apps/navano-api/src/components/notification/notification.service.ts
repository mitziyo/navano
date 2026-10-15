import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ObjectId } from 'mongoose';
import { Notification, Notifications } from '../../libs/dto/notification/notification';
import { NotificationsInquiry, NotifyInput } from '../../libs/dto/notification/notification.input';
import { NotificationStatus, NotificationType } from '../../libs/enums/notification.enum';
import { T } from '../../libs/types/common';
import { shapeIntoMongoObjectId } from '../../libs/config';

const DESC_LENGTH = 80;

const lookupAuthor = {
	$lookup: {
		from: 'members',
		localField: 'authorId',
		foreignField: '_id',
		as: 'authorData',
	},
};

// The thing a notification points at; used to undo a like notification
const refOf = (input: Pick<NotifyInput, 'productId' | 'articleId'>): T => {
	if (input.productId) return { productId: input.productId };
	if (input.articleId) return { articleId: input.articleId };
	return {};
};

@Injectable()
export class NotificationService {
	private readonly logger = new Logger(NotificationService.name);

	constructor(@InjectModel('Notification') private readonly notificationModel: Model<Notification>) {}

	/** WRITE (called by like, comment and follow flows) **/

	// Never fails the action that triggered it: a lost notification is better than a failed like
	public async notify(input: NotifyInput): Promise<void> {
		// ObjectIds and id strings both serialize to the same JSON string
		if (!input.receiverId || JSON.stringify(input.authorId) === JSON.stringify(input.receiverId)) return;
		try {
			await this.notificationModel.create({
				...input,
				notificationTitle: input.notificationTitle?.slice(0, 120) || '—',
				notificationDesc: input.notificationDesc?.slice(0, DESC_LENGTH),
			});
		} catch (err) {
			this.logger.warn(`notify failed: ${(err as Error).message}`);
		}
	}

	// A like that was taken back removes its notification, so like/unlike does not spam the bell
	public async withdrawLike(
		input: Pick<NotifyInput, 'notificationGroup' | 'authorId' | 'receiverId' | 'productId' | 'articleId'>,
	): Promise<void> {
		try {
			await this.notificationModel
				.deleteMany({
					notificationType: NotificationType.LIKE,
					notificationGroup: input.notificationGroup,
					authorId: input.authorId,
					receiverId: input.receiverId,
					...refOf(input),
				})
				.exec();
		} catch (err) {
			this.logger.warn(`withdrawLike failed: ${(err as Error).message}`);
		}
	}

	/** READ (the receiver) **/

	public async getNotifications(memberId: ObjectId, input: NotificationsInquiry): Promise<Notifications> {
		const match: T = { receiverId: memberId };
		if (input.notificationStatus) match.notificationStatus = input.notificationStatus;

		const result = await this.notificationModel
			.aggregate<Notifications>([
				{ $match: match },
				{ $sort: { createdAt: -1 } },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupAuthor,
							{ $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		return result[0] ?? { list: [], metaCounter: [] };
	}

	public async getUnreadNotifications(memberId: ObjectId): Promise<number> {
		return await this.notificationModel
			.countDocuments({ receiverId: memberId, notificationStatus: NotificationStatus.WAIT })
			.exec();
	}

	// Only the receiver's own notifications change; returns how many were marked
	public async readNotifications(memberId: ObjectId, ids?: string[]): Promise<number> {
		const match: T = { receiverId: memberId, notificationStatus: NotificationStatus.WAIT };
		if (ids) match._id = { $in: ids.map((id) => shapeIntoMongoObjectId(id) as ObjectId) };

		const result = await this.notificationModel
			.updateMany(match, { notificationStatus: NotificationStatus.READ })
			.exec();
		return result.modifiedCount;
	}
}
