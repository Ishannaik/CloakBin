import { db } from '$lib/db';
import type { AdminAdapter } from '$lib/db/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const adminDb = db as AdminAdapter;

	// Fetch stats and chart data in parallel
	const [statsResult, chartResult] = await Promise.all([
		adminDb.getPasteStats(),
		adminDb.getDailyPasteCounts(30)
	]);

	// Get recent pastes for activity feed
	const recentResult = await adminDb.listPastes({
		page: 1,
		limit: 5,
		sortBy: 'createdAt',
		sortOrder: 'desc'
	});

	return {
		stats: statsResult.success
			? statsResult.data
			: {
					total: 0,
					today: 0,
					withPassword: 0,
					burnAfterRead: 0,
					totalSizeBytes: 0,
					avgSizeBytes: 0
				},
		chartData: chartResult.success ? chartResult.data : [],
		recentPastes: recentResult.success ? recentResult.data.pastes : []
	};
};
