import type { Model, ObjectId } from 'mongoose';
import { NotificationService } from './notification.service';
import type { Notification } from '../../libs/dto/notification/notification';
import { NotificationGroup, NotificationStatus, NotificationType } from '../../libs/enums/notification.enum';

// uuid is ESM-only and Jest runs CommonJS; config.ts only needs it for image names
jest.mock('uuid', () => ({ v4: () => 'uuid' }));

describe('NotificationService', () => {
	const author = '650000000000000000000001' as unknown as ObjectId;
	const receiver = '650000000000000000000002' as unknown as ObjectId;
	let create: jest.Mock;
	let deleteMany: jest.Mock;
	let updateMany: jest.Mock;
	let service: NotificationService;

	beforeEach(() => {
		create = jest.fn().mockResolvedValue({});
		deleteMany = jest.fn().mockReturnValue({ exec: () => Promise.resolve({ deletedCount: 1 }) });
		updateMany = jest.fn().mockReturnValue({ exec: () => Promise.resolve({ modifiedCount: 2 }) });
		service = new NotificationService({ create, deleteMany, updateMany } as unknown as Model<Notification>);
	});

	const like = {
		notificationType: NotificationType.LIKE,
		notificationGroup: NotificationGroup.PRODUCT,
		notificationTitle: 'Red Roses',
		authorId: author,
		receiverId: receiver,
		productId: '650000000000000000000003' as unknown as ObjectId,
	};

	it('stores a notification for someone else', async () => {
		await service.notify(like);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ receiverId: receiver, notificationTitle: 'Red Roses' }),
		);
	});

	it('never notifies members about their own actions', async () => {
		await service.notify({ ...like, receiverId: author });
		expect(create).not.toHaveBeenCalled();
	});

	it('cuts long comments and does not throw when saving fails', async () => {
		create.mockRejectedValueOnce(new Error('db down'));
		await expect(
			service.notify({ ...like, notificationType: NotificationType.COMMENT, notificationDesc: 'x'.repeat(500) }),
		).resolves.toBeUndefined();
		expect((create.mock.calls[0] as [{ notificationDesc: string }])[0].notificationDesc).toHaveLength(80);
	});

	it('withdraws the like notification of the same target', async () => {
		await service.withdrawLike(like);
		expect(deleteMany).toHaveBeenCalledWith({
			notificationType: NotificationType.LIKE,
			notificationGroup: NotificationGroup.PRODUCT,
			authorId: author,
			receiverId: receiver,
			productId: like.productId,
		});
	});

	it('marks only the receiver’s unread notifications as read', async () => {
		const count = await service.readNotifications(receiver);
		expect(updateMany).toHaveBeenCalledWith(
			{ receiverId: receiver, notificationStatus: NotificationStatus.WAIT },
			{ notificationStatus: NotificationStatus.READ },
		);
		expect(count).toBe(2);
	});
});
