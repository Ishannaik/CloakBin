import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/db';

export const GET: RequestHandler = async () => {
    try {
        const result = await db.healthCheck();
        if (!result.success) {
            return json({ ok: false, error: 'database unavailable' }, { status: 503 });
        }
        return json({ ok: true, db: env.DB_TYPE }, { status: 200 });
    } catch {
        return json({ ok: false, error: 'database unavailable' }, { status: 503 });
    }
};
