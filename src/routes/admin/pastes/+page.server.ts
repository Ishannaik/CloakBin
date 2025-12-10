import { db } from '$lib/db';
import type { AdminAdapter } from '$lib/db/types';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const adminDb = db as AdminAdapter;

	const page = parseInt(url.searchParams.get('page') || '1');
	const search = url.searchParams.get('q') || undefined;
	const hasPassword = url.searchParams.get('password') === 'true' ? true : undefined;
	const burnAfterRead = url.searchParams.get('burn') === 'true' ? true : undefined;

	const result = await adminDb.listPastes({
		page,
		limit: 20,
		search,
		hasPassword,
		burnAfterRead,
		sortBy: 'createdAt',
		sortOrder: 'desc'
	});

	if (!result.success) {
		return {
			pastes: [],
			pagination: { page: 1, totalPages: 1, total: 0 }
		};
	}

	return {
		pastes: result.data.pastes,
		pagination: {
			page,
			totalPages: Math.ceil(result.data.total / 20),
			total: result.data.total
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
