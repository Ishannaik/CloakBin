import { redirect } from '@sveltejs/kit';
import { accounts } from '$lib/db/accounts';
import { logout, SESSION_COOKIE } from '$lib/server/accounts/service';
import { clearSessionCookie } from '$lib/server/accounts/cookie';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	throw redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await logout(accounts, token);
		clearSessionCookie(cookies);
		throw redirect(303, '/login');
	}
};
