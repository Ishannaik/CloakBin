import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async () => {
    try {
        await db.healthCheck();
        return json({ ok: true, db: 'mongodb' }, { status: 200 }); 
    } catch (err) {
        return json({ ok: false, error: 'database unavailable' }, { status: 503 });
    }
};