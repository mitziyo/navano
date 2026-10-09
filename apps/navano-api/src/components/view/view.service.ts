import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';
import { T } from '../../libs/types/common';
import type { ObjectId } from 'mongoose';
import { lookupVisit } from '../../libs/config';
import { Products } from '../../libs/dto/product/product';
import { OrdinaryInquiry } from '../../libs/dto/product/product.input';
import { ViewGroup } from '../../libs/enums/view.enum';

@Injectable()
export class ViewService {
	constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}

	public async recordView(input: ViewInput): Promise<View | null> {
		const viewExist = await this.checkViewExistence(input);
		if (!viewExist) {
			('- New View Insert-');
			return await this.viewModel.create(input);
		} else return null;
	}

	private async checkViewExistence(input: ViewInput): Promise<View | null> {
		const { memberId, viewRefId } = input;
		const search: T = {
			memberId: memberId,
			viewRefId: viewRefId,
		};
		return await this.viewModel.findOne(search).exec();
	}

	public async getVisitedProducts(memberId: ObjectId, inqut: OrdinaryInquiry): Promise<Products> {
		const { page, limit } = inqut;

		const match: T = { viewGroup: ViewGroup.PRODUCT, memberId: memberId };

		// joriy a'zo ko'rgan productlarni topib, ularning to'liq ma'lumotini (products kolleksiyasidan) biriktiradi
		const data: T = await this.viewModel
			.aggregate([
				{ $match: match },
				{ $sort: { updatedAt: -1 } },

				{
					$lookup: {
						from: 'products',
						localField: 'viewRefId',
						foreignField: '_id',
						as: 'visitedProduct',
					},
				},

				{ $unwind: '$visitedProduct' },

				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },

							lookupVisit,
							{ $unwind: '$visitedProduct.memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		console.log('data', data);

		// natija "view" hujjatlari shaklida keladi, shuning uchun faqat ichidagi productni ajratib olamiz
		const result: Products = { list: [], metaCounter: data[0].metaCounter };

		result.list = data[0].list.map((ele: T) => ele.visitedProduct);
		console.log('result', result);

		return result;
	}
}
