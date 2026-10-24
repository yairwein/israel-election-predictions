import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearSessionCookie } from '$lib/server/session';

export const POST: RequestHandler = async ({ cookies }) => {
	clearSessionCookie(cookies);
	return json({ ok: true });
};
