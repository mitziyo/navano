import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { ObjectId } from 'mongoose';
import { ProductService } from '../product/product.service';
import { MemberService } from '../member/member.service';
import { AssistantInput, AssistantReply } from '../../libs/dto/assistant/assistant';
import { Product } from '../../libs/dto/product/product';
import { Message } from '../../libs/enums/common.enum';
import { ProductLocation, ProductOccasion, ProductType } from '../../libs/enums/product.enum';
import { Member } from '../../libs/dto/member/member';

export const ASSISTANT_MODEL = 'claude-opus-5-5';
export const ASSISTANT_HOURLY_LIMIT = 20;
const MAX_TOOL_ROUNDS = 4;
const MAX_CARDS = 4;
const HOUR_MS = 60 * 60 * 1000;

const TYPES = Object.values(ProductType);
const OCCASIONS = Object.values(ProductOccasion);
const LOCATIONS = Object.values(ProductLocation);

// Frozen text: no dates or ids, so the prompt cache stays valid across requests
const SYSTEM_PROMPT = `You are Navano AI, the shopping assistant of Navano, a marketplace where local stores in South Korea sell flowers, chocolates and cakes.

How to help:
- Help customers find a gift: ask at most one short question when the request is too vague (occasion, city, budget), otherwise search right away.
- Before you recommend or mention any product or store, look it up with the tools. Never invent products, stores, prices or stock.
- Write prices with a $ sign, the way the site shows them (e.g. $120). Product types: FLOWER, CHOCOLATE, CAKE. Occasions: BIRTHDAY, WEDDING, ANNIVERSARY, HOLIDAY. Cities: ${LOCATIONS.join(', ')}.
- The products you found are shown to the customer as cards under your reply, so refer to them by name and price and do not paste links or ids.
- If nothing matches, say so and suggest the closest alternative (another city, type or a wider budget).
- Navano cannot take orders or payments in this chat. For orders, delivery, payments or account problems, point the customer to the Customer Service page (/cs).
- Stay on topic: gifts, flowers, chocolates, cakes and using Navano. Politely decline anything else.

Style: reply in the customer's language (English, Korean or Russian). Keep replies short and warm: two to five sentences or a short list. Plain text only, no markdown headings or tables.`;

const TOOLS: Anthropic.Beta.BetaTool[] = [
	{
		name: 'search_products',
		description:
			'Search ACTIVE products on Navano. All filters are optional and combined with AND. Returns up to 6 products sorted by popularity, plus the total number of matches.',
		input_schema: {
			type: 'object',
			properties: {
				types: { type: 'array', items: { type: 'string', enum: TYPES }, description: 'Product types' },
				occasions: { type: 'array', items: { type: 'string', enum: OCCASIONS }, description: 'Occasions' },
				locations: { type: 'array', items: { type: 'string', enum: LOCATIONS }, description: 'Cities' },
				min_price: { type: 'integer', description: 'Minimum price in won' },
				max_price: { type: 'integer', description: 'Maximum price in won' },
				text: { type: 'string', description: 'Words to match in the product title, e.g. "rose" or "macaron"' },
			},
			additionalProperties: false,
		},
	},
	{
		name: 'search_stores',
		description:
			'Search stores (sellers) on Navano by name, city or the product types they sell. Returns up to 5 stores.',
		input_schema: {
			type: 'object',
			properties: {
				text: { type: 'string', description: 'Store name or nickname' },
				locations: { type: 'array', items: { type: 'string', enum: LOCATIONS }, description: 'Cities' },
				types: { type: 'array', items: { type: 'string', enum: TYPES }, description: 'Product types the store sells' },
			},
			additionalProperties: false,
		},
	},
	{
		name: 'get_catalog_overview',
		description:
			'Number of ACTIVE products in total and per type, occasion and city. Use it to answer "what do you have" questions.',
		input_schema: { type: 'object', properties: {}, additionalProperties: false },
	},
];

type ToolInput = Record<string, unknown>;

// Keeps only allowed enum values from model input
const pickEnums = <E extends string>(value: unknown, allowed: E[]): E[] | undefined => {
	if (!Array.isArray(value)) return undefined;
	const list = value.filter((item): item is E => allowed.includes(item as E));
	return list.length ? list : undefined;
};

const pickText = (value: unknown): string | undefined =>
	typeof value === 'string' && value.trim() ? value.trim().slice(0, 100) : undefined;

const pickPrice = (value: unknown): number | undefined =>
	typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined;

@Injectable()
export class AssistantService {
	private readonly logger = new Logger(AssistantService.name);
	private readonly usage = new Map<string, number[]>();
	private client: Anthropic | null = null;

	constructor(
		private readonly productService: ProductService,
		private readonly memberService: MemberService,
	) {}

	public async askAssistant(memberId: ObjectId, input: AssistantInput): Promise<AssistantReply> {
		const client = this.getClient();
		const messages = this.toMessages(input);
		if (!messages.length) throw new BadRequestException(Message.BAD_REQUEST);
		this.checkLimit(JSON.stringify(memberId));

		let cards: Product[] = [];

		try {
			for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
				const response = await client.beta.messages.create({
					model: ASSISTANT_MODEL,
					max_tokens: 4000,
					output_config: { effort: 'low' },
					betas: ['server-side-fallback-2026-07-01'],
					fallbacks: 'default',
					system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
					tools: TOOLS,
					messages,
				});

				if (response.stop_reason === 'refusal') {
					return {
						text: "Sorry, I can't help with that. I can help you find flowers, chocolates or cakes.",
						products: [],
					};
				}

				const toolUses = response.content.filter(
					(block): block is Anthropic.Beta.BetaToolUseBlock => block.type === 'tool_use',
				);

				// Last round has no room for more tool calls: answer with what we have
				if (response.stop_reason !== 'tool_use' || !toolUses.length || round === MAX_TOOL_ROUNDS) {
					const text = response.content
						.filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
						.map((block) => block.text)
						.join('\n')
						.trim();
					return { text: text || "Sorry, I couldn't answer that. Please try asking another way.", products: cards };
				}

				messages.push({ role: 'assistant', content: response.content });

				const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
				for (const toolUse of toolUses) {
					try {
						const { content, products } = await this.runTool(memberId, toolUse.name, toolUse.input as ToolInput);
						if (products) cards = products.slice(0, MAX_CARDS);
						results.push({ type: 'tool_result', tool_use_id: toolUse.id, content });
					} catch (err) {
						this.logger.warn(`Tool ${toolUse.name} failed: ${(err as Error).message}`);
						results.push({ type: 'tool_result', tool_use_id: toolUse.id, content: 'Search failed.', is_error: true });
					}
				}
				messages.push({ role: 'user', content: results });
			}
		} catch (err) {
			if (err instanceof Anthropic.RateLimitError) {
				this.logger.warn('Claude API rate limit');
			} else if (err instanceof Anthropic.APIError) {
				this.logger.error(`Claude API error ${err.status}: ${err.message}`);
			} else {
				throw err;
			}
			throw new InternalServerErrorException(Message.ASSISTANT_UNAVAILABLE);
		}

		throw new InternalServerErrorException(Message.ASSISTANT_UNAVAILABLE);
	}

	private getClient(): Anthropic {
		if (this.client) return this.client;
		if (!process.env.ANTHROPIC_API_KEY) throw new InternalServerErrorException(Message.ASSISTANT_UNAVAILABLE);
		this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000 });
		return this.client;
	}

	// Sliding window: at most ASSISTANT_HOURLY_LIMIT requests per member per hour (per server process)
	private checkLimit(memberKey: string): void {
		const now = Date.now();
		const recent = (this.usage.get(memberKey) ?? []).filter((time) => now - time < HOUR_MS);
		if (recent.length >= ASSISTANT_HOURLY_LIMIT) throw new BadRequestException(Message.ASSISTANT_LIMIT);
		recent.push(now);
		this.usage.set(memberKey, recent);
	}

	// Client history → API messages: starts with a user turn, ends with a user turn, roles alternate
	private toMessages(input: AssistantInput): Anthropic.Beta.BetaMessageParam[] {
		const turns: { role: 'user' | 'assistant'; text: string }[] = [];
		for (const turn of input.messages) {
			const text = turn.text.trim();
			if (!text) continue;
			if (!turns.length && turn.role !== 'user') continue;
			const last = turns[turns.length - 1];
			if (last && last.role === turn.role) last.text = `${last.text}\n\n${text}`;
			else turns.push({ role: turn.role, text });
		}
		if (!turns.length || turns[turns.length - 1].role !== 'user') return [];
		return turns.map((turn) => ({ role: turn.role, content: turn.text }));
	}

	private async runTool(
		memberId: ObjectId,
		name: string,
		input: ToolInput,
	): Promise<{ content: string; products?: Product[] }> {
		switch (name) {
			case 'search_products': {
				const minPrice = pickPrice(input.min_price);
				const maxPrice = pickPrice(input.max_price);
				const result = await this.productService.getProducts(memberId, {
					page: 1,
					limit: 6,
					sort: 'productRank',
					search: {
						typeList: pickEnums(input.types, TYPES),
						occasionList: pickEnums(input.occasions, OCCASIONS),
						locationList: pickEnums(input.locations, LOCATIONS),
						pricesRange:
							minPrice !== undefined || maxPrice !== undefined
								? { start: minPrice ?? 0, end: maxPrice ?? Number.MAX_SAFE_INTEGER }
								: undefined,
						text: pickText(input.text),
					},
				});
				const list = result.list ?? [];
				return {
					content: JSON.stringify({
						total: result.metaCounter?.[0]?.total ?? 0,
						products: list.map((product) => ({
							title: product.productTitle,
							type: product.productType,
							occasion: product.productOccasion,
							city: product.productLocation,
							price: product.productPrice,
							inStock: product.productItemCount,
							likes: product.productLikes,
							store: product.memberData?.memberFullName ?? product.memberData?.memberNick,
							description: product.productDesc?.slice(0, 200),
						})),
					}),
					products: list,
				};
			}
			case 'search_stores': {
				const result = await this.memberService.getAgents(memberId, {
					page: 1,
					limit: 5,
					sort: 'memberLikes',
					search: {
						text: pickText(input.text),
						locationList: pickEnums(input.locations, LOCATIONS),
						typeList: pickEnums(input.types, TYPES),
					},
				});
				return {
					content: JSON.stringify({
						total: result.metaCounter?.[0]?.total ?? 0,
						stores: (result.list ?? []).map((store: Member) => ({
							name: store.memberFullName ?? store.memberNick,
							nick: store.memberNick,
							address: store.memberAddress,
							products: store.memberProducts,
							likes: store.memberLikes,
							description: store.memberDesc?.slice(0, 200),
						})),
					}),
				};
			}
			case 'get_catalog_overview': {
				return { content: JSON.stringify(await this.productService.getProductFacets()) };
			}
			default:
				return { content: `Unknown tool: ${name}` };
		}
	}
}
