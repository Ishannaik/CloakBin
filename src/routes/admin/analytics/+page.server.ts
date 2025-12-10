import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import type { AdminAdapter } from '$lib/db/types';

const adminDb = db as AdminAdapter;

export const load: PageServerLoad = async ({ url }) => {
	const range = url.searchParams.get('range') || '7d';

	// Calculate days from range
	const daysMap: Record<string, number> = {
		'1h': 1,
		'24h': 1,
		'7d': 7,
		'30d': 30,
		'1y': 365,
		'all': 365
	};
	const days = daysMap[range] || 7;

	// Get stats and daily counts from database
	const [statsResult, dailyResult] = await Promise.all([
		adminDb.getPasteStats(),
		adminDb.getDailyPasteCounts(days)
	]);

	const stats = statsResult.success ? statsResult.data : null;
	const dailyCounts = dailyResult.success ? dailyResult.data : [];

	return {
		stats: {
			pastesTotal: stats?.total ?? 0,
			pastesToday: stats?.today ?? 0,
			withPassword: stats?.withPassword ?? 0,
			burnAfterRead: stats?.burnAfterRead ?? 0,
			totalSizeBytes: stats?.totalSizeBytes ?? 0,
			avgSizeBytes: stats?.avgSizeBytes ?? 0,
		},
		dailyCounts,
		range
	};
};
