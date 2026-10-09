import { BadRequestException } from '@nestjs/common';
import type { Model, ObjectId } from 'mongoose';
import { ProductService } from './product.service';
import type { MemberService } from '../member/member.service';
import type { ViewService } from '../view/view.service';
import type { LikeService } from '../like/like.service';
import type { Product } from '../../libs/dto/product/product';
import { ProductLocation, ProductStatus, ProductType } from '../../libs/enums/product.enum';
import { ProductsInquiry } from '../../libs/dto/product/product.input';
import { ProductUpdate } from '../../libs/dto/product/product.update';
import { T } from '../../libs/types/common';

// uuid is ESM-only and Jest runs CommonJS; config.ts only needs it for image names
jest.mock('uuid', () => ({ v4: () => 'uuid' }));

type ShapeMatchQuery = { shapeMatchQuery: (match: T, input: ProductsInquiry) => void };

describe('ProductService', () => {
	const memberId = '650000000000000000000001' as unknown as ObjectId;
	const productId = '650000000000000000000002' as unknown as ObjectId;

	let findOneAndUpdate: jest.Mock;
	let aggregate: jest.Mock;
	let memberStatsEditor: jest.Mock;
	let service: ProductService;

	beforeEach(() => {
		findOneAndUpdate = jest.fn();
		aggregate = jest.fn();
		memberStatsEditor = jest.fn();
		service = new ProductService(
			{ findOneAndUpdate, aggregate } as unknown as Model<Product>,
			{ memberStatsEditor } as unknown as MemberService,
			{} as unknown as ViewService,
			{} as unknown as LikeService,
		);
	});

	describe('shapeMatchQuery', () => {
		it('builds a match on product fields only', () => {
			const match: T = {};
			const input = {
				page: 1,
				limit: 10,
				search: {
					locationList: [ProductLocation.SEOUL],
					typeList: [ProductType.FLOWER, ProductType.CAKE],
					pricesRange: { start: 10, end: 100 },
					text: 'rose',
				},
			} as ProductsInquiry;

			(service as unknown as ShapeMatchQuery).shapeMatchQuery(match, input);

			expect(match).toEqual({
				productLocation: { $in: [ProductLocation.SEOUL] },
				productType: { $in: [ProductType.FLOWER, ProductType.CAKE] },
				productPrice: { $gte: 10, $lte: 100 },
				productTitle: { $regex: /rose/i },
			});
		});
	});

	describe('getAgentProducts', () => {
		it('rejects a DELETE status search', async () => {
			await expect(
				service.getAgentProducts(memberId, {
					page: 1,
					limit: 10,
					search: { productStatus: ProductStatus.DELETE },
				}),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(aggregate).not.toHaveBeenCalled();
		});
	});

	describe('updateProduct', () => {
		it('stores soldAt and decreases memberProducts when sold', async () => {
			findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve({ _id: productId }) });
			const input = { _id: productId, productStatus: ProductStatus.SOLD } as ProductUpdate;

			await service.updateProduct(memberId, input);

			expect(input.soldAt).toBeInstanceOf(Date);
			expect(findOneAndUpdate).toHaveBeenCalledWith(
				{ _id: productId, memberId, productStatus: ProductStatus.ACTIVE },
				input,
				{ new: true },
			);
			expect(memberStatsEditor).toHaveBeenCalledWith({
				_id: memberId,
				targetKey: 'memberProducts',
				modifier: -1,
			});
		});
	});
});
