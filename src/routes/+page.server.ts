import { redirect } from '@sveltejs/kit';
import { createRequiresLogin } from '$lib/server/accounts/env';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, setHeaders }) => {
	if (createRequiresLogin()) {
		// Login-only instance: the editor is for members (and the admin). Everyone else
		// gets the sign-in page. Reading pastes at /p/[id] is not affected.
		if (!locals.user && !locals.isAdmin) throw redirect(303, '/login');
		// SECURITY: this response now depends on who is asking, so no shared caching.
		setHeaders({ 'cache-control': 'private, no-store' });
		return { username: locals.user?.username ?? null };
	}

	// Signed-in members can exist with the flag off (invites still work), and they need a
	// sign-out button. Their response is per-user, so keep it out of shared caches.
	if (locals.user) {
		setHeaders({ 'cache-control': 'private, no-store' });
		return { username: locals.user.username };
	}

	// PERF: the home/create shell is identical for every visitor (auth + editor state are
	// entirely client-side), so let the CDN cache the SSR HTML. Not prerendered — that would
	// bypass the hooks and drop the CSP/HSTS security headers.
	setHeaders({
		'cache-control': 'public, s-maxage=60, stale-while-revalidate=86400'
	});
	return { username: null };
};
