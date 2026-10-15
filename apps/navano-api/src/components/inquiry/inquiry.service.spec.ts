import { BadRequestException } from '@nestjs/common';
import type { Model, ObjectId } from 'mongoose';
import { InquiryService } from './inquiry.service';
import type { Inquiry } from '../../libs/dto/inquiry/inquiry';
import { InquiryStatus, InquiryType } from '../../libs/enums/inquiry.enum';

// uuid is ESM-only and Jest runs CommonJS; config.ts only needs it for image names
jest.mock('uuid', () => ({ v4: () => 'uuid' }));

describe('InquiryService', () => {
	const memberId = '650000000000000000000001' as unknown as ObjectId;
	const adminId = '650000000000000000000009' as unknown as ObjectId;
	const inquiryId = '650000000000000000000005' as unknown as ObjectId;
	let create: jest.Mock;
	let findOneAndUpdate: jest.Mock;
	let aggregate: jest.Mock;
	let service: InquiryService;

	beforeEach(() => {
		create = jest.fn().mockImplementation((doc: unknown) => Promise.resolve(doc));
		findOneAndUpdate = jest.fn();
		aggregate = jest.fn().mockReturnValue({ exec: () => Promise.resolve([{ list: [], metaCounter: [] }]) });
		service = new InquiryService({ create, findOneAndUpdate, aggregate } as unknown as Model<Inquiry>);
	});

	it('creates a waiting inquiry for the member', async () => {
		const result = await service.createInquiry(memberId, {
			inquiryType: InquiryType.ORDER,
			inquiryTitle: 'Late delivery',
			inquiryContent: 'My cake has not arrived yet.',
		});

		expect(result).toMatchObject({ memberId, inquiryStatus: InquiryStatus.WAIT });
	});

	it('lets the owner withdraw only a waiting inquiry', async () => {
		findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve(null) });

		await expect(service.removeInquiry(memberId, inquiryId)).rejects.toThrow(BadRequestException);
		expect(findOneAndUpdate).toHaveBeenCalledWith(
			{ _id: inquiryId, memberId, inquiryStatus: InquiryStatus.WAIT },
			{ inquiryStatus: InquiryStatus.DELETE },
			{ new: true },
		);
	});

	it('stores the answer, who answered and when', async () => {
		findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve({ _id: inquiryId }) });

		await service.answerInquiryByAdmin(adminId, { _id: inquiryId, inquiryAnswer: '  We are on it.  ' });

		const update = (findOneAndUpdate.mock.calls[0] as [unknown, Record<string, unknown>])[1];
		expect(update).toMatchObject({
			inquiryAnswer: 'We are on it.',
			inquiryStatus: InquiryStatus.ANSWERED,
			answeredBy: adminId,
		});
		expect(update.answeredAt).toBeInstanceOf(Date);
	});

	it('hides withdrawn inquiries from the member list and the admin inbox', async () => {
		await service.getMyInquiries(memberId, { page: 1, limit: 10 });
		await service.getAllInquiriesByAdmin({ page: 1, limit: 10, search: {} });

		type Calls = [{ $match: Record<string, unknown> }[]][];
		const calls = aggregate.mock.calls as Calls;
		const myMatch = calls[0][0][0].$match;
		const adminMatch = calls[1][0][0].$match;
		expect(myMatch).toEqual({ memberId, inquiryStatus: { $ne: InquiryStatus.DELETE } });
		expect(adminMatch).toEqual({ inquiryStatus: { $ne: InquiryStatus.DELETE } });
	});
});
