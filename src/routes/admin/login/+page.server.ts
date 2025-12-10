import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If already logged in, redirect to admin
	if (locals.isAdmin) {
		throw redirect(302, '/admin');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString();
		const password = formData.get('password')?.toString();

		const adminUser = env.ADMIN_USER;
		const adminPass = env.ADMIN_PASS;

		// Check if admin credentials are configured
		if (!adminUser || !adminPass) {
			return fail(500, {
				error: 'Admin credentials not configured. Set ADMIN_USER and ADMIN_PASS in .env'
			});
		}

		// Validate credentials
		if (!username || !password) {
			return fail(400, { error: 'Username and password are required' });
		}

		if (username !== adminUser || password !== adminPass) {
			return fail(401, { error: 'Invalid username or password' });
		}

		// Create session
		const timestamp = Date.now();
		const sessionData = username + ':' + timestamp;
		const sessionToken = Buffer.from(sessionData).toString('base64');

		cookies.set('admin_session', sessionToken, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 // 24 hours
		});

		throw redirect(302, '/admin');
	}
};
