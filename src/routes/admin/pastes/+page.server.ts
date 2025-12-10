import { db } from '$lib/db';
import type { AdminAdapter } from '$lib/db/types';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ url }) => {
	const adminDb = db as AdminAdapter;

	const page = parseInt(url.searchParams.get('page') || '1');
	const limitParam = parseInt(url.searchParams.get('limit') || String(DEFAULT_PAGE_SIZE));
	const limit = PAGE_SIZE_OPTIONS.includes(limitParam) ? limitParam : DEFAULT_PAGE_SIZE;

	const search = url.searchParams.get('q') || undefined;
	const hasPassword = url.searchParams.get('password') === 'true' ? true : undefined;
	const burnAfterRead = url.searchParams.get('burn') === 'true' ? true : undefined;

	// Size filter (stored in bytes)
	const sizeMinParam = url.searchParams.get('sizeMin');
	const sizeMaxParam = url.searchParams.get('sizeMax');
	const sizeMin = sizeMinParam ? parseInt(sizeMinParam) : undefined;
	const sizeMax = sizeMaxParam ? parseInt(sizeMaxParam) : undefined;

	// Date filter
	const createdAfterParam = url.searchParams.get('createdAfter');
	const createdBeforeParam = url.searchParams.get('createdBefore');
	const createdAfter = createdAfterParam ? new Date(createdAfterParam) : undefined;
	const createdBefore = createdBeforeParam ? new Date(createdBeforeParam + 'T23:59:59') : undefined; // End of day

	// Status filter
	const status = url.searchParams.get('status') as 'expired' | 'expiring' | 'active' | undefined;

	// Sort params - map frontend column names to DB field names
	const sortParam = url.searchParams.get('sort') || 'created';
	const sortOrder = (url.searchParams.get('order') || 'desc') as 'asc' | 'desc';

	// Map frontend column names to database field names
	const sortFieldMap: Record<string, string> = {
		'created': 'createdAt',
		'expires': 'expiresAt',
		'size': 'encryptedSize'
	};
	const sortBy = sortFieldMap[sortParam] || 'createdAt';

	const result = await adminDb.listPastes({
		page,
		limit,
		search,
		hasPassword,
		burnAfterRead,
		sizeMin,
		sizeMax,
		createdAfter,
		createdBefore,
		status,
		sortBy,
		sortOrder
	});

	if (!result.success) {
		return {
			pastes: [],
			pagination: { page: 1, totalPages: 1, total: 0, limit }
		};
	}

	return {
		pastes: result.data.pastes,
		pagination: {
			page,
			totalPages: Math.ceil(result.data.total / limit),
			total: result.data.total,
			limit
		}
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Paste ID required' });
		}

		const result = await db.deletePaste(id);
		if (!result.success) {
			return fail(500, { error: result.error });
		}

		return { success: true };
	},

	bulkDelete: async ({ request }) => {
		const adminDb = db as AdminAdapter;
		const formData = await request.formData();
		const idsStr = formData.get('ids')?.toString();

		if (!idsStr) {
			return fail(400, { error: 'No pastes selected' });
		}

		const ids = idsStr.split(',').filter(Boolean);
		if (ids.length === 0) {
			return fail(400, { error: 'No pastes selected' });
		}

		const result = await adminDb.deletePastes(ids);
		if (!result.success) {
			return fail(500, { error: result.error });
		}

		return { success: true, deleted: result.data.deleted };
	}
};
