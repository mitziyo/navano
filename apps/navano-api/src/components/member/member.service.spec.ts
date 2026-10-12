import type { Model, ObjectId } from 'mongoose';
import { MemberService } from './member.service';
import type { AuthService } from '../auth/auth.service';
import type { ViewService } from '../view/view.service';
import type { LikeService } from '../like/like.service';
import type { Member } from '../../libs/dto/member/member';
import type { Follower, Following } from '../../libs/dto/follow/follow';
import { ProductLocation, ProductType } from '../../libs/enums/product.enum';
import { T } from '../../libs/types/common';

// uuid is ESM-only and Jest runs CommonJS; config.ts only needs it for image names
jest.mock('uuid', () => ({ v4: () => 'uuid' }));

describe('MemberService', () => {
	const memberId = '650000000000000000000001' as unknown as ObjectId;
	const storeId = '650000000000000000000002' as unknown as ObjectId;

	let aggregate: jest.Mock;
	let findOne: jest.Mock;
	let findOneAndUpdate: jest.Mock;
	let toggleLike: jest.Mock;
	let service: MemberService;

	beforeEach(() => {
		aggregate = jest.fn().mockReturnValue({ exec: () => Promise.resolve([{ list: [], metaCounter: [] }]) });
		findOne = jest.fn().mockReturnValue({ exec: () => Promise.resolve({ _id: storeId }) });
		findOneAndUpdate = jest.fn().mockReturnValue({ exec: () => Promise.resolve({ _id: storeId, memberLikes: 1 }) });
		toggleLike = jest.fn();
		service = new MemberService(
			{ aggregate, findOne, findOneAndUpdate } as unknown as Model<Member>,
			{} as unknown as Model<Follower | Following>,
			{} as unknown as AuthService,
			{} as unknown as ViewService,
			{ toggleLike } as unknown as LikeService,
		);
	});

	describe('getAgents', () => {
		const pipelineOf = () => (aggregate.mock.calls[0] as [T[]])[0];

		it('searches the nick and full name literally', async () => {
			await service.getAgents(memberId, { page: 1, limit: 6, search: { text: 'rose (' } });

			const [{ $match: match }] = pipelineOf() as [{ $match: T }];
			const [{ $or: or }] = match.$and as [{ $or: { memberNick: RegExp }[] }];
			expect(or).toHaveLength(2);
			expect(or[0].memberNick.test('Rose (Atelier')).toBe(true);
		});

		it('filters cities by address, including other spellings', async () => {
			await service.getAgents(memberId, {
				page: 1,
				limit: 6,
				search: { locationList: [ProductLocation.DAEJON] },
			});

			const [{ $match: match }] = pipelineOf() as [{ $match: T }];
			const [{ memberAddress }] = match.$and as [{ memberAddress: { $regex: RegExp } }];
			expect(memberAddress.$regex.test('Yuseong-gu, Daejeon')).toBe(true);
			expect(memberAddress.$regex.test('Haeundae-gu, Busan')).toBe(false);
		});

		it('keeps only stores that sell the requested product types', async () => {
			await service.getAgents(memberId, {
				page: 1,
				limit: 6,
				search: { typeList: [ProductType.CAKE] },
			});

			const pipeline = pipelineOf();
			const lookup = pipeline[1] as { $lookup: { from: string; pipeline: { $match?: T }[] } };
			expect(lookup.$lookup.from).toBe('products');
			expect(lookup.$lookup.pipeline[0].$match?.productType).toEqual({ $in: [ProductType.CAKE] });
			expect(pipeline[2]).toEqual({ $match: { 'typeMatch.0': { $exists: true } } });
		});

		it('adds no product lookup without a type filter', async () => {
			await service.getAgents(memberId, { page: 1, limit: 6, search: {} });

			const pipeline = pipelineOf();
			expect(pipeline.some((stage) => '$lookup' in stage)).toBe(false);
		});
	});

	describe('likeTargetMember', () => {
		it('returns meLiked after a like and an empty list after an unlike', async () => {
			toggleLike.mockResolvedValueOnce(1);
			const liked = await service.likeTargetMember(memberId, storeId);
			expect(liked.meLiked).toEqual([{ memberId, likeRefId: storeId, myFavorite: true }]);

			toggleLike.mockResolvedValueOnce(-1);
			const unliked = await service.likeTargetMember(memberId, storeId);
			expect(unliked.meLiked).toEqual([]);
		});
	});
});
