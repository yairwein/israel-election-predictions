import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { meView } from '$lib/server/me';
import { getRepo } from '$lib/server/repo';

/** The signed-in user's nickname, current prediction and full history. Never returns the email. */
export const GET: RequestHandler = async ({ locals }) => {
	const me = await meView(locals);
	const history = locals.uid && me.publicId ? await getRepo().history(locals.uid) : [];
	return json({ ...me, history }, { headers: { 'cache-control': 'private, no-store' } });
};
