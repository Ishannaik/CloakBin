import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Allow access to login page without auth
	if (url.pathname === '/admin/login') {
		return {};
	}

	// Redirect to login if not authenticated
	if (!locals.isAdmin) {
		throw redirect(302, '/admin/login');
	}

	return {
		isAdmin: locals.isAdmin
	};
};
