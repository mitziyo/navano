import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import type { ObjectId } from 'mongoose';
import { AssistantService, ASSISTANT_HOURLY_LIMIT } from './assistant.service';
import type { ProductService } from '../product/product.service';
import type { MemberService } from '../member/member.service';
import { ProductLocation, ProductOccasion, ProductType } from '../../libs/enums/product.enum';
import { Message } from '../../libs/enums/common.enum';

// uuid is ESM-only and Jest runs CommonJS; config.ts only needs it for image names
jest.mock('uuid', () => ({ v4: () => 'uuid' }));

describe('AssistantService', () => {
	const memberId = '650000000000000000000001' as unknown as ObjectId;
	const ask = { messages: [{ role: 'user' as const, text: 'Birthday roses in Seoul under 100000' }] };
	const product = {
		_id: 'p1',
		productTitle: 'Red Roses',
		productPrice: 50000,
		memberData: { memberNick: 'rose_atelier' },
	};

	let getProducts: jest.Mock;
	let create: jest.Mock;
	let service: AssistantService;

	const setClient = () => {
		(service as unknown as { client: unknown }).client = { beta: { messages: { create } } };
	};

	beforeEach(() => {
		getProducts = jest.fn().mockResolvedValue({ list: [product], metaCounter: [{ total: 1 }] });
		create = jest.fn();
		service = new AssistantService(
			{ getProducts, getProductFacets: jest.fn() } as unknown as ProductService,
			{ getAgents: jest.fn() } as unknown as MemberService,
		);
		setClient();
	});

	it('runs search_products with sanitized filters and returns product cards', async () => {
		create
			.mockResolvedValueOnce({
				stop_reason: 'tool_use',
				content: [
					{
						type: 'tool_use',
						id: 'tu1',
						name: 'search_products',
						input: { types: ['FLOWER', 'HOUSE'], occasions: ['BIRTHDAY'], locations: ['SEOUL'], max_price: 100000 },
					},
				],
			})
			.mockResolvedValueOnce({
				stop_reason: 'end_turn',
				content: [{ type: 'text', text: 'Try Red Roses for ₩50,000.' }],
			});

		const reply = await service.askAssistant(memberId, ask);

		expect(getProducts).toHaveBeenCalledWith(memberId, {
			page: 1,
			limit: 6,
			sort: 'productRank',
			search: {
				typeList: [ProductType.FLOWER],
				occasionList: [ProductOccasion.BIRTHDAY],
				locationList: [ProductLocation.SEOUL],
				pricesRange: { start: 0, end: 100000 },
				text: undefined,
			},
		});
		expect(reply).toEqual({ text: 'Try Red Roses for ₩50,000.', products: [product] });

		const secondCall = (create.mock.calls[1] as [{ messages: { content: unknown[] }[] }])[0];
		expect(secondCall.messages).toHaveLength(3);
		expect(secondCall.messages[2].content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'tu1' });
	});

	it('returns a fixed reply on refusal', async () => {
		create.mockResolvedValueOnce({ stop_reason: 'refusal', content: [] });

		const reply = await service.askAssistant(memberId, ask);

		expect(reply.products).toEqual([]);
		expect(reply.text).toContain('flowers, chocolates or cakes');
	});

	it('limits requests per member per hour', async () => {
		create.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hi!' }] });

		for (let i = 0; i < ASSISTANT_HOURLY_LIMIT; i++) await service.askAssistant(memberId, ask);

		await expect(service.askAssistant(memberId, ask)).rejects.toThrow(new BadRequestException(Message.ASSISTANT_LIMIT));
	});

	it('rejects a history that does not end with a user turn', async () => {
		await expect(
			service.askAssistant(memberId, {
				messages: [
					{ role: 'user', text: 'Hi' },
					{ role: 'assistant', text: 'Hello' },
				],
			}),
		).rejects.toThrow(BadRequestException);
		expect(create).not.toHaveBeenCalled();
	});

	it('is unavailable without an API key', async () => {
		const key = process.env.ANTHROPIC_API_KEY;
		delete process.env.ANTHROPIC_API_KEY;
		(service as unknown as { client: unknown }).client = null;

		await expect(service.askAssistant(memberId, ask)).rejects.toThrow(InternalServerErrorException);

		if (key !== undefined) process.env.ANTHROPIC_API_KEY = key;
	});
});
