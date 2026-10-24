import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSummary, publicSummary } from '$lib/server/aggregate';

export const GET: RequestHandler = async () => {
	return json(publicSummary(await getSummary()), { headers: { 'cache-control': 'public, max-age=10' } });
};
