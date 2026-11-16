import { describe, it, expect, vi, afterEach } from 'vitest';
import { db } from '$lib/db';
import { GET } from './+server';

/** The handler ignores its event, so an empty stand-in is enough. */
const event = {} as Parameters<typeof GET>[0];

afterEach(() => {
	vi.restoreAllMocks();
});

describe('GET /api/health', () => {
	it('returns 200 when the database health check succeeds', async () => {
		vi.spyOn(db, 'healthCheck').mockResolvedValue({ success: true, data: undefined });

		const res = await GET(event);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, db: 'memory' });
	});

	it('returns 503 when the database health check fails', async () => {
		vi.spyOn(db, 'healthCheck').mockResolvedValue({ success: false, error: 'connection refused' });

		const res = await GET(event);

		expect(res.status).toBe(503);
		expect(await res.json()).toEqual({ ok: false, error: 'database unavailable' });
	});

	it('returns 503 when the database health check throws', async () => {
		vi.spyOn(db, 'healthCheck').mockRejectedValue(new Error('socket hang up'));

		const res = await GET(event);

		expect(res.status).toBe(503);
		expect(await res.json()).toEqual({ ok: false, error: 'database unavailable' });
	});
});
