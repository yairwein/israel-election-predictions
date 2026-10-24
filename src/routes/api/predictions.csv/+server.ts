import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepo } from '$lib/server/repo';
import { resultsHidden } from '$lib/server/config';
import { predictionsCsv } from '$lib/csv';
import { rateLimit } from '$lib/server/http';

/** All counted predictions as CSV. Public fields only: no emails, no internal ids. */
export const GET: RequestHandler = async ({ getClientAddress }) => {
	if (resultsHidden()) error(403, { message: 'התוצאות מוסתרות כרגע' });
	rateLimit(`csv:${getClientAddress()}`, 20, 60_000);
	const preds = await getRepo().counted();
	const body = predictionsCsv(
		preds.map((p) => ({ nickname: p.nickname, updatedAt: p.updatedAt, version: p.version, seats: p.seats, turnout: p.turnout }))
	);
	const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
	return new Response(body, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="election-2026-predictions-${date}.csv"`,
			'cache-control': 'public, max-age=60'
		}
	});
};
