import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ObjectId } from 'mongoose';
import { Inquiries, Inquiry } from '../../libs/dto/inquiry/inquiry';
import {
	AllInquiriesInquiry,
	InquiriesInquiry,
	InquiryAnswerInput,
	InquiryInput,
} from '../../libs/dto/inquiry/inquiry.input';
import { InquiryStatus } from '../../libs/enums/inquiry.enum';
import { Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { lookupMember } from '../../libs/config';

@Injectable()
export class InquiryService {
	constructor(@InjectModel('Inquiry') private readonly inquiryModel: Model<Inquiry>) {}

	/** MEMBER **/

	public async createInquiry(memberId: ObjectId, input: InquiryInput): Promise<Inquiry> {
		try {
			return await this.inquiryModel.create({ ...input, memberId, inquiryStatus: InquiryStatus.WAIT });
		} catch (err) {
			console.log('Error, Service.createInquiry:', (err as Error).message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getMyInquiries(memberId: ObjectId, input: InquiriesInquiry): Promise<Inquiries> {
		const match: T = { memberId, inquiryStatus: { $ne: InquiryStatus.DELETE } };
		return await this.list(match, input.page, input.limit, false);
	}

	// Members can withdraw a question only before it is answered
	public async removeInquiry(memberId: ObjectId, inquiryId: ObjectId): Promise<Inquiry> {
		const result = await this.inquiryModel
			.findOneAndUpdate(
				{ _id: inquiryId, memberId, inquiryStatus: InquiryStatus.WAIT },
				{ inquiryStatus: InquiryStatus.DELETE },
				{ new: true },
			)
			.exec();
		if (!result) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		return result;
	}

	/** ADMIN **/

	public async getAllInquiriesByAdmin(input: AllInquiriesInquiry): Promise<Inquiries> {
		const { inquiryStatus, inquiryType } = input.search;
		const match: T = { inquiryStatus: inquiryStatus ?? { $ne: InquiryStatus.DELETE } };
		if (inquiryType) match.inquiryType = inquiryType;
		return await this.list(match, input.page, input.limit, true);
	}

	public async answerInquiryByAdmin(adminId: ObjectId, input: InquiryAnswerInput): Promise<Inquiry> {
		const result = await this.inquiryModel
			.findOneAndUpdate(
				{ _id: input._id, inquiryStatus: { $ne: InquiryStatus.DELETE } },
				{
					inquiryAnswer: input.inquiryAnswer.trim(),
					inquiryStatus: InquiryStatus.ANSWERED,
					answeredAt: new Date(),
					answeredBy: adminId,
				},
				{ new: true },
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result;
	}

	public async countWaiting(): Promise<number> {
		return await this.inquiryModel.countDocuments({ inquiryStatus: InquiryStatus.WAIT }).exec();
	}

	/** HELPERS **/

	private async list(match: T, page: number, limit: number, withAuthor: boolean): Promise<Inquiries> {
		const author = withAuthor
			? [lookupMember, { $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } }]
			: [];
		const result = await this.inquiryModel
			.aggregate<Inquiries>([
				{ $match: match },
				{ $sort: { createdAt: -1 } },
				{
					$facet: {
						list: [{ $skip: (page - 1) * limit }, { $limit: limit }, ...author],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		return result[0] ?? { list: [], metaCounter: [] };
	}
}
