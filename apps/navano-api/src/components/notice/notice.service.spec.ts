import { BadRequestException } from '@nestjs/common';
import type { Model, ObjectId } from 'mongoose';
import { NoticeService } from './notice.service';
import type { Notice } from '../../libs/dto/notice/notice';
import { NoticeCategory, NoticeStatus, NoticeTopic } from '../../libs/enums/notice.enum';

// uuid is ESM-only and Jest runs CommonJS; config.ts only needs it for image names
jest.mock('uuid', () => ({ v4: () => 'uuid' }));

type Pipeline = { $match?: Record<string, unknown>; $sort?: Record<string, number> }[];

describe('NoticeService', () => {
	const adminId = '650000000000000000000009' as unknown as ObjectId;
	let aggregate: jest.Mock;
	let create: jest.Mock;
	let findById: jest.Mock;
	let findByIdAndUpdate: jest.Mock;
	let service: NoticeService;

	beforeEach(() => {
		aggregate = jest.fn().mockReturnValue({ exec: () => Promise.resolve([{ list: [], metaCounter: [] }]) });
		create = jest.fn().mockImplementation((doc: unknown) => Promise.resolve(doc));
		findById = jest.fn();
		findByIdAndUpdate = jest.fn().mockReturnValue({ exec: () => Promise.resolve({ _id: 'n1' }) });
		service = new NoticeService({ aggregate, create, findById, findByIdAndUpdate } as unknown as Model<Notice>);
	});

	it('lists only ACTIVE notices of one category, newest first, with a literal text search', async () => {
		await service.getNotices({ page: 1, limit: 10, search: { noticeCategory: NoticeCategory.NOTICE, text: '(sale' } });

		const pipeline = (aggregate.mock.calls[0] as [Pipeline])[0];
		expect(pipeline[0].$match).toMatchObject({
			noticeCategory: NoticeCategory.NOTICE,
			noticeStatus: NoticeStatus.ACTIVE,
		});
		expect(pipeline[0].$match?.$or).toHaveLength(2);
		expect(pipeline[1].$sort).toEqual({ createdAt: -1, _id: -1 });
	});

	it('keeps FAQ in the order it was written', async () => {
		await service.getNotices({ page: 1, limit: 10, search: { noticeCategory: NoticeCategory.FAQ } });

		const pipeline = (aggregate.mock.calls[0] as [Pipeline])[0];
		expect(pipeline[1].$sort).toEqual({ createdAt: 1, _id: 1 });
	});

	it('rejects a topic that does not belong to the category', async () => {
		await expect(
			service.createNotice(adminId, {
				noticeCategory: NoticeCategory.NOTICE,
				noticeTopic: NoticeTopic.PRODUCTS,
				noticeTitle: 'Title',
				noticeContent: 'Content',
			}),
		).rejects.toThrow(BadRequestException);
		expect(create).not.toHaveBeenCalled();
	});

	it('creates a notice owned by the admin', async () => {
		const result = await service.createNotice(adminId, {
			noticeCategory: NoticeCategory.FAQ,
			noticeTopic: NoticeTopic.STORES,
			noticeTitle: 'How do I open a store?',
			noticeContent: 'Sign up as a store.',
		});

		expect(result).toMatchObject({ memberId: adminId, noticeTopic: NoticeTopic.STORES });
	});

	it('clears the link when the update sends an empty string', async () => {
		findById.mockReturnValue({
			exec: () => Promise.resolve({ noticeCategory: NoticeCategory.NOTICE, noticeTopic: NoticeTopic.UPDATE }),
		});

		await service.updateNotice({ _id: 'n1' as unknown as ObjectId, noticeLink: '', noticeTitle: 'New title' });

		expect(findByIdAndUpdate).toHaveBeenCalledWith(
			'n1',
			{ $set: { noticeTitle: 'New title' }, $unset: { noticeLink: 1 } },
			{ new: true },
		);
	});
});
