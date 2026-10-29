import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { POST } from './+server';
import { GET } from './[id]/+server';

beforeEach(() => {
	vi.stubEnv('CREATE_REQUIRES_LOGIN', 'false');
});

afterEach(() => {
	vi.unstubAllEnvs();
});

/** Build the minimal RequestEvent the POST handler reads (request + locals). */
function postEvent(body: unknown) {
	const request = new Request('http://localhost/api/paste', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return { request, locals: { user: null, isAdmin: false } } as unknown as Parameters<
		typeof POST
	>[0];
}

function getEvent(id: string) {
	return { params: { id } } as unknown as Parameters<typeof GET>[0];
}

describe('POST /api/paste', () => {
	it('returns 201 and an id for a valid body', async () => {
		const res = await POST(postEvent({ content: 'ciphertext', expiry: '1h' }));

		expect(res.status).toBe(201);
		const data = await res.json();
		expect(typeof data.id).toBe('string');
		expect(data.id.length).toBeGreaterThan(0);
	});

	it('returns 400 for an empty content', async () => {
		const res = await POST(postEvent({ content: '', expiry: '1h' }));

		expect(res.status).toBe(400);
	});

	it('returns 400 for a body with invalid expiry', async () => {
		const res = await POST(postEvent({ content: 'ciphertext', expiry: 'invalid' }));

		expect(res.status).toBe(400);
	});
});

describe('GET /api/paste/:id', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns the stored content for a valid id', async () => {
		const createRes = await POST(postEvent({ content: 'ciphertext', expiry: '1h' }));
		const { id } = await createRes.json();

		const getRes = await GET(getEvent(id));

		expect(getRes.status).toBe(200);
		const data = await getRes.json();
		expect(data.content).toBe('ciphertext');
	});

	it('returns 404 for a non-existent id', async () => {
		const getRes = await GET(getEvent('unknown-id'));

		expect(getRes.status).toBe(404);
	});

	it('returns 404 for an expired paste', async () => {
		vi.useFakeTimers();
		// Create a paste with the shortest valid expiry
		const createRes = await POST(postEvent({ content: 'ciphertext', expiry: '1h' }));
		const { id } = await createRes.json();

		// Jump just past the 1h expiry
		vi.advanceTimersByTime(60 * 60 * 1000 + 1);

		const getRes = await GET(getEvent(id));

		expect(getRes.status).toBe(404);
	});
});
