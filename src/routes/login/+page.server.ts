import { fail, redirect } from '@sveltejs/kit';
import { accounts } from '$lib/db/accounts';
import { login } from '$lib/server/accounts/service';
import { setSessionCookie } from '$lib/server/accounts/cookie';
import { createRequiresLogin } from '$lib/server/accounts/env';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/');
	return { requiresLogin: createRequiresLogin() };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const username = form.get('username')?.toString() ?? '';
		const password = form.get('password')?.toString() ?? '';
		if (!username || !password) {
			return fail(400, { username, error: 'Enter your username and password' });
		}

		const result = await login(accounts, username, password);
		if (!result.ok) {
			const error =
				result.reason === 'locked'
					? 'Too many failed attempts for this account. Try again in 15 minutes.'
					: result.reason === 'error'
						? 'Sign-in is unavailable right now. Try again shortly.'
						: 'Wrong username or password';
			return fail(result.reason === 'locked' ? 429 : result.reason === 'error' ? 503 : 401, {
				username,
				error
			});
		}

		setSessionCookie(cookies, result.token, url);
		throw redirect(303, '/');
	}
};
