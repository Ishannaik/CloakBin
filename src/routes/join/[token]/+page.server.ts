import { fail, redirect } from '@sveltejs/kit';
import { accounts } from '$lib/db/accounts';
import { isInviteValid, redeemInvite, PASSWORD_MIN } from '$lib/server/accounts/service';
import { setSessionCookie } from '$lib/server/accounts/cookie';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	// SECURITY: the invite token is in the path; keep this page out of every cache.
	setHeaders({ 'cache-control': 'no-store' });
	return { valid: await isInviteValid(accounts, params.token), passwordMin: PASSWORD_MIN };
};

export const actions: Actions = {
	default: async ({ request, params, cookies, url }) => {
		const form = await request.formData();
		const username = form.get('username')?.toString() ?? '';
		const password = form.get('password')?.toString() ?? '';
		const confirm = form.get('confirm')?.toString() ?? '';
		if (password !== confirm) {
			return fail(400, { username, error: 'The passwords do not match' });
		}

		const result = await redeemInvite(accounts, params.token, username, password);
		if (!result.ok) return fail(400, { username, error: result.error });

		setSessionCookie(cookies, result.token, url);
		throw redirect(303, '/');
	}
};
