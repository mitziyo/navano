import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminStats, CollectionStats, StatCount } from '../../libs/dto/dashboard/dashboard';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type FacetResult = {
	total: { count: number }[];
	recent: { count: number }[];
	byStatus: StatCount[];
	byType: StatCount[];
};

@Injectable()
export class DashboardService {
	constructor(
		@InjectModel('Member') private readonly memberModel: Model<unknown>,
		@InjectModel('Product') private readonly productModel: Model<unknown>,
		@InjectModel('BoardArticle') private readonly articleModel: Model<unknown>,
		@InjectModel('Inquiry') private readonly inquiryModel: Model<unknown>,
		@InjectModel('Notice') private readonly noticeModel: Model<unknown>,
	) {}

	public async getAdminStats(): Promise<AdminStats> {
		const since = new Date(Date.now() - WEEK_MS);
		const [members, products, articles, inquiries, notices] = await Promise.all([
			this.stats(this.memberModel, 'memberStatus', 'memberType', since),
			this.stats(this.productModel, 'productStatus', 'productType', since),
			this.stats(this.articleModel, 'articleStatus', 'articleCategory', since),
			this.stats(this.inquiryModel, 'inquiryStatus', 'inquiryType', since),
			this.stats(this.noticeModel, 'noticeStatus', 'noticeCategory', since),
		]);
		return { members, products, articles, inquiries, notices };
	}

	// One aggregation per collection: total, created in the last 7 days, counts by status and by type
	private async stats(
		model: Model<unknown>,
		statusField: string,
		typeField: string,
		since: Date,
	): Promise<CollectionStats> {
		const countBy = (field: string) => [
			{ $group: { _id: `$${field}`, count: { $sum: 1 } } },
			{ $project: { _id: 0, value: '$_id', count: 1 } },
			{ $sort: { count: -1 as const } },
		];
		const [result] = await model
			.aggregate<FacetResult>([
				{
					$facet: {
						total: [{ $count: 'count' }],
						recent: [{ $match: { createdAt: { $gte: since } } }, { $count: 'count' }],
						byStatus: countBy(statusField),
						byType: countBy(typeField),
					},
				},
			])
			.exec();

		return {
			total: result?.total?.[0]?.count ?? 0,
			newThisWeek: result?.recent?.[0]?.count ?? 0,
			byStatus: (result?.byStatus ?? []).filter((item) => item.value),
			byType: (result?.byType ?? []).filter((item) => item.value),
		};
	}
}
