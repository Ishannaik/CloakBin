import { fail, redirect } from '@sveltejs/kit';
import { accounts } from '$lib/db/accounts';
import { createInvite, INVITE_MAX_AGE_MS } from '$lib/server/accounts/service';
import { createRequiresLogin } from '$lib/server/accounts/env';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.isAdmin) throw redirect(302, '/admin/login');
	const [users, invites] = await Promise.all([accounts.listUsers(), accounts.listInvites()]);
	return {
		requiresLogin: createRequiresLogin(),
		inviteDays: INVITE_MAX_AGE_MS / (24 * 60 * 60 * 1000),
		loadError: !users.success || !invites.success,
		// Never send password hashes or token hashes to the browser.
		users: users.success
			? users.data.map((u) => ({
					id: u.id,
					username: u.username,
					createdAt: u.createdAt,
					lastLoginAt: u.lastLoginAt
				}))
			: [],
		invites: invites.success
			? invites.data.map((i) => ({ id: i.id, createdAt: i.createdAt, expiresAt: i.expiresAt }))
			: []
	};
};

export const actions: Actions = {
	invite: async ({ locals, url }) => {
		if (!locals.isAdmin) throw redirect(302, '/admin/login');
		const created = await createInvite(accounts);
		if (!created)
			return fail(500, { error: 'Could not create the invite. Check the database connection.' });
		// The raw token exists only in this response; the store keeps its hash.
		return { inviteUrl: `${url.origin}/join/${created.token}` };
	},

	revokeInvite: async ({ locals, request }) => {
		if (!locals.isAdmin) throw redirect(302, '/admin/login');
		const id = (await request.formData()).get('id')?.toString();
		if (!id) return fail(400, { error: 'Missing invite id' });
		const result = await accounts.deleteInvite(id);
		return result.success ? { revoked: true } : fail(500, { error: 'Could not revoke the invite' });
	},

	deleteUser: async ({ locals, request }) => {
		if (!locals.isAdmin) throw redirect(302, '/admin/login');
		const id = (await request.formData()).get('id')?.toString();
		if (!id) return fail(400, { error: 'Missing user id' });
		// Also ends every session the user holds, so they are signed out at once.
		const result = await accounts.deleteUser(id);
		return result.success ? { deleted: true } : fail(500, { error: 'Could not delete the user' });
	}
};
