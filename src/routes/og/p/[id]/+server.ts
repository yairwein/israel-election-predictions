import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepo } from '$lib/server/repo';
import { ogPng } from '$lib/server/og';
import { publicOrigin } from '$lib/server/config';

export const GET: RequestHandler = async ({ params, url }) => {
	const p = await getRepo().byPublicId(params.id);
	if (!p) error(404, 'not found');
	const png = ogPng({
		title: `התחזית של ${p.nickname}`,
		subtitle: 'הבחירות לכנסת ה-26 · 27.10.2026',
		seats: p.seats,
		footer: 'מה התחזית שלכם?',
		host: new URL(publicOrigin(url)).host
	});
	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			// the ?v= version in the URL changes on every update, so this can be cached
			'cache-control': url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=300'
		}
	});
};
