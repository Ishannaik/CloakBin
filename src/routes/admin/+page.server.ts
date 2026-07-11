import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import type { AdminAdapter } from '$lib/db/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.isAdmin) throw redirect(302, '/admin/login');
	const adminDb = db as AdminAdapter;

	// Fetch all dashboard data in parallel — no sequential round-trips
	const [statsResult, recentResult] = await Promise.all([
		adminDb.getPasteStats(),
		adminDb.listPastes({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
	]);

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
		recentPastes: recentResult.success ? recentResult.data.pastes : []
	};
};
