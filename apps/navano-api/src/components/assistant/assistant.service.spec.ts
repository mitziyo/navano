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
	let generateContent: jest.Mock;
	let service: AssistantService;

	const modelTurn = (parts: unknown[]) => ({
		candidates: [{ finishReason: 'STOP', content: { role: 'model', parts } }],
	});

	const setClient = () => {
		(service as unknown as { client: unknown }).client = { models: { generateContent } };
	};

	beforeEach(() => {
		getProducts = jest.fn().mockResolvedValue({ list: [product], metaCounter: [{ total: 1 }] });
		generateContent = jest.fn();
		service = new AssistantService(
			{ getProducts, getProductFacets: jest.fn() } as unknown as ProductService,
			{ getAgents: jest.fn() } as unknown as MemberService,
		);
		setClient();
	});

	it('runs search_products with sanitized filters and returns product cards', async () => {
		generateContent
			.mockResolvedValueOnce(
				modelTurn([
					{
						functionCall: {
							id: 'fc1',
							name: 'search_products',
							args: { types: ['FLOWER', 'HOUSE'], occasions: ['BIRTHDAY'], locations: ['SEOUL'], max_price: 100000 },
						},
						thoughtSignature: 'sig',
					},
				]),
			)
			.mockResolvedValueOnce(modelTurn([{ text: 'Try Red Roses for ₩50,000.' }]));

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

		const secondCall = (generateContent.mock.calls[1] as [{ contents: { role: string; parts: unknown[] }[] }])[0];
		expect(secondCall.contents).toHaveLength(3);
		expect(secondCall.contents[1]).toMatchObject({ role: 'model', parts: [{ thoughtSignature: 'sig' }] });
		expect(secondCall.contents[2]).toMatchObject({
			role: 'user',
			parts: [{ functionResponse: { id: 'fc1', name: 'search_products' } }],
		});
	});

	it('returns a fixed reply when the answer is blocked', async () => {
		generateContent.mockResolvedValueOnce({ candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] });

		const reply = await service.askAssistant(memberId, ask);

		expect(reply.products).toEqual([]);
		expect(reply.text).toContain('flowers, chocolates or cakes');
	});

	it('turns tools off in the last round so the model answers in text', async () => {
		const call = modelTurn([{ functionCall: { id: 'fc', name: 'search_products', args: {} } }]);
		generateContent
			.mockResolvedValueOnce(call)
			.mockResolvedValueOnce(call)
			.mockResolvedValueOnce(call)
			.mockResolvedValueOnce(call)
			.mockResolvedValueOnce(modelTurn([{ text: 'Here are some bouquets.' }]));

		const reply = await service.askAssistant(memberId, ask);

		const configs = generateContent.mock.calls.map(
			(args) => (args as [{ config: { toolConfig?: unknown } }])[0].config,
		);
		expect(configs).toHaveLength(5);
		expect(configs.slice(0, 4).every((config) => config.toolConfig === undefined)).toBe(true);
		expect(configs[4].toolConfig).toEqual({ functionCallingConfig: { mode: 'NONE' } });
		expect(reply.text).toBe('Here are some bouquets.');
	});

	it('limits requests per member per hour', async () => {
		generateContent.mockResolvedValue(modelTurn([{ text: 'Hi!' }]));

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
		expect(generateContent).not.toHaveBeenCalled();
	});

	it('is unavailable without an API key', async () => {
		const key = process.env.GEMINI_API_KEY;
		delete process.env.GEMINI_API_KEY;
		(service as unknown as { client: unknown }).client = null;

		await expect(service.askAssistant(memberId, ask)).rejects.toThrow(InternalServerErrorException);

		if (key !== undefined) process.env.GEMINI_API_KEY = key;
	});
});
