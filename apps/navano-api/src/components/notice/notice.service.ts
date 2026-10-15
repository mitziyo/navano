import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ObjectId } from 'mongoose';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import { AllNoticesInquiry, NoticeInput, NoticesInquiry } from '../../libs/dto/notice/notice.input';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';
import { NoticeCategory, NoticeStatus, NoticeTopic } from '../../libs/enums/notice.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { escapeRegex, lookupMember } from '../../libs/config';

// Topics allowed per category (GENERAL fits all)
export const NOTICE_TOPICS: Record<NoticeCategory, NoticeTopic[]> = {
	[NoticeCategory.NOTICE]: [NoticeTopic.GENERAL, NoticeTopic.EVENT, NoticeTopic.POLICY, NoticeTopic.UPDATE],
	[NoticeCategory.FAQ]: [
		NoticeTopic.GENERAL,
		NoticeTopic.PRODUCTS,
		NoticeTopic.BUYERS,
		NoticeTopic.STORES,
		NoticeTopic.ACCOUNT,
		NoticeTopic.COMMUNITY,
	],
	[NoticeCategory.TERMS]: [NoticeTopic.GENERAL],
};

@Injectable()
export class NoticeService {
	constructor(@InjectModel('Notice') private readonly noticeModel: Model<Notice>) {}

	/** ADMIN **/

	public async createNotice(memberId: ObjectId, input: NoticeInput): Promise<Notice> {
		this.checkTopic(input.noticeCategory, input.noticeTopic ?? NoticeTopic.GENERAL);
		try {
			return await this.noticeModel.create({ ...input, memberId });
		} catch (err) {
			console.log('Error, Service.createNotice:', (err as Error).message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async updateNotice(input: NoticeUpdate): Promise<Notice> {
		const current = await this.noticeModel.findById(input._id).exec();
		if (!current) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		this.checkTopic(input.noticeCategory ?? current.noticeCategory, input.noticeTopic ?? current.noticeTopic);

		const { _id, ...update } = input;
		const unset: T = {};
		// An empty link clears it
		if (update.noticeLink === '') {
			delete update.noticeLink;
			unset.noticeLink = 1;
		}

		const result = await this.noticeModel
			.findByIdAndUpdate(_id, { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result;
	}

	// Permanent delete only after the notice was moved to DELETE (same rule as products)
	public async removeNotice(noticeId: ObjectId): Promise<Notice> {
		const result = await this.noticeModel.findOneAndDelete({ _id: noticeId, noticeStatus: NoticeStatus.DELETE }).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result;
	}

	public async getAllNoticesByAdmin(input: AllNoticesInquiry): Promise<Notices> {
		const { noticeCategory, noticeStatus, text } = input.search;
		const match: T = {};
		if (noticeCategory) match.noticeCategory = noticeCategory;
		if (noticeStatus) match.noticeStatus = noticeStatus;
		if (text) match.noticeTitle = { $regex: new RegExp(escapeRegex(text), 'i') };

		const sort: T = { [input.sort ?? 'createdAt']: Direction.DESC };
		return await this.list(match, sort, input.page, input.limit, true);
	}

	/** PUBLIC **/

	public async getNotices(input: NoticesInquiry): Promise<Notices> {
		const { noticeCategory, noticeTopic, text } = input.search;
		const match: T = { noticeCategory, noticeStatus: NoticeStatus.ACTIVE };
		if (noticeTopic) match.noticeTopic = noticeTopic;
		if (text) {
			const pattern = new RegExp(escapeRegex(text), 'i');
			match.$or = [{ noticeTitle: pattern }, { noticeContent: pattern }];
		}

		// Notices read newest first; FAQ and terms keep the order they were written in
		const direction = noticeCategory === NoticeCategory.NOTICE ? Direction.DESC : Direction.ASC;
		return await this.list(match, { createdAt: direction, _id: direction }, input.page, input.limit, false);
	}

	public async getNotice(noticeId: ObjectId): Promise<Notice> {
		const result = await this.noticeModel.findOne({ _id: noticeId, noticeStatus: NoticeStatus.ACTIVE }).exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result;
	}

	/** HELPERS **/

	private checkTopic(category: NoticeCategory, topic: NoticeTopic): void {
		if (!NOTICE_TOPICS[category]?.includes(topic)) throw new BadRequestException(Message.BAD_REQUEST);
	}

	private async list(match: T, sort: T, page: number, limit: number, withAuthor: boolean): Promise<Notices> {
		const author = withAuthor
			? [lookupMember, { $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } }]
			: [];
		const result = await this.noticeModel
			.aggregate<Notices>([
				{ $match: match },
				{ $sort: sort },
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
