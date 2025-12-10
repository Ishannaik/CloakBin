import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Redirect GET requests to admin
	throw redirect(302, '/admin');
};

export const actions: Actions = {
	default: async ({ cookies }) => {
		// Clear the admin session cookie
		cookies.delete('admin_session', { path: '/' });
		throw redirect(302, '/admin/login');
	}
};
