/**
 * Route-level checks for CREATE_REQUIRES_LOGIN: the create endpoint and home page
 * are gated, while reading a paste by link stays public.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { isRedirect } from '@sveltejs/kit';

process.env.DB_TYPE = 'memory';

type Locals = { user: { id: string; username: string } | null; isAdmin: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (event: any) => Promise<Response>;

let createPaste: Handler;
let readPaste: Handler;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let homeLoad: (event: any) => unknown;

beforeAll(async () => {
	createPaste = (await import('../../../routes/api/paste/+server')).POST as Handler;
	readPaste = (await import('../../../routes/api/paste/[id]/+server')).GET as Handler;
	homeLoad = (await import('../../../routes/+page.server')).load as typeof homeLoad;
});

afterEach(() => {
	delete process.env.CREATE_REQUIRES_LOGIN;
});

const anon: Locals = { user: null, isAdmin: false };
const member: Locals = { user: { id: 'u1', username: 'alice' }, isAdmin: false };

function create(locals: Locals) {
	const request = new Request('http://localhost/api/paste', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ content: 'ciphertext-only', expiry: '1h' })
	});
	return createPaste({ request, locals });
}

describe('POST /api/paste with CREATE_REQUIRES_LOGIN', () => {
	it('stays open when the flag is unset', async () => {
		expect((await create(anon)).status).toBe(201);
	});

	it('returns 401 to anonymous callers when the flag is on', async () => {
		process.env.CREATE_REQUIRES_LOGIN = 'true';
		const res = await create(anon);
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: 'Sign in to create pastes on this instance' });
	});

	it('lets a signed-in member or the admin create', async () => {
		process.env.CREATE_REQUIRES_LOGIN = 'true';
		expect((await create(member)).status).toBe(201);
		expect((await create({ user: null, isAdmin: true })).status).toBe(201);
	});
});

describe('reading stays public', () => {
	it('serves a paste to an anonymous reader when the flag is on', async () => {
		const created = await create(member);
		const { id } = await created.json();

		process.env.CREATE_REQUIRES_LOGIN = 'true';
		const res = await readPaste({ params: { id }, locals: anon });
		expect(res.status).toBe(200);
		expect((await res.json()).content).toBe('ciphertext-only');
	});
});

describe('home page with CREATE_REQUIRES_LOGIN', () => {
	const setHeaders = () => {};

	it('sends anonymous visitors to /login', () => {
		process.env.CREATE_REQUIRES_LOGIN = 'true';
		try {
			homeLoad({ locals: anon, setHeaders });
			expect.unreachable('expected a redirect');
		} catch (e) {
			expect(isRedirect(e) && e.location).toBe('/login');
		}
	});

	it('shows the editor to members without shared caching', () => {
		process.env.CREATE_REQUIRES_LOGIN = 'true';
		let headers: Record<string, string> = {};
		const data = homeLoad({ locals: member, setHeaders: (h: Record<string, string>) => (headers = h) });
		expect(data).toEqual({ username: 'alice' });
		expect(headers['cache-control']).toBe('private, no-store');
	});

	it('keeps the cacheable open editor when the flag is off', () => {
		let headers: Record<string, string> = {};
		const data = homeLoad({ locals: anon, setHeaders: (h: Record<string, string>) => (headers = h) });
		expect(data).toEqual({ username: null });
		expect(headers['cache-control']).toContain('public');
	});
});
