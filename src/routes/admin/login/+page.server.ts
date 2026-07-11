import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createHmac, createHash, timingSafeEqual } from 'crypto';
import type { Actions, PageServerLoad } from './$types';

function safeEqual(a: string, b: string): boolean {
	// Hash both sides to fixed 32-byte buffers so timingSafeEqual gets equal-length
	// inputs (no length leak) and the comparison runs in constant time.
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

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

		// Constant-time credential comparison. Both sides are computed before the
		// branch so the || cannot reintroduce a short-circuit timing difference.
		const userOk = safeEqual(username, adminUser);
		const passOk = safeEqual(password, adminPass);
		if (!userOk || !passOk) {
			return fail(401, { error: 'Invalid username or password' });
		}

		// Create HMAC-signed session token
		const timestamp = Date.now();
		const payload = timestamp + ':' + username;
		const signature = createHmac('sha256', adminPass).update(payload).digest('hex');
		const sessionToken = Buffer.from(payload + ':' + signature).toString('base64');

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
