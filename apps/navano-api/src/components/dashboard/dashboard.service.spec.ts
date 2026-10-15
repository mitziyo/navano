import type { Model } from 'mongoose';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
	const modelReturning = (facet: unknown) =>
		({ aggregate: jest.fn().mockReturnValue({ exec: () => Promise.resolve([facet]) }) }) as unknown as Model<unknown>;

	it('maps each collection facet and drops empty buckets', async () => {
		const products = modelReturning({
			total: [{ count: 9 }],
			recent: [{ count: 2 }],
			byStatus: [
				{ value: 'ACTIVE', count: 8 },
				{ value: null, count: 1 },
			],
			byType: [{ value: 'CAKE', count: 3 }],
		});
		const empty = modelReturning({ total: [], recent: [], byStatus: [], byType: [] });
		const service = new DashboardService(empty, products, empty, empty, empty);

		const stats = await service.getAdminStats();

		expect(stats.products).toEqual({
			total: 9,
			newThisWeek: 2,
			byStatus: [{ value: 'ACTIVE', count: 8 }],
			byType: [{ value: 'CAKE', count: 3 }],
		});
		expect(stats.members).toEqual({ total: 0, newThisWeek: 0, byStatus: [], byType: [] });
	});
});
