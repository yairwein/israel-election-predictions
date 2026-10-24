import type { RequestHandler } from './$types';
import { getSummary } from '$lib/server/aggregate';
import { POLL_AVERAGE } from '$lib/parties';
import { ogPng, storyPng } from '$lib/server/og';
import { publicOrigin } from '$lib/server/config';

export const GET: RequestHandler = async ({ url }) => {
	const s = await getSummary();
	const has = !s.hidden && s.aggregate && s.n > 0;
	const render = url.searchParams.get('format') === 'story' ? storyPng : ogPng;
	const png = render({
		title: has ? 'ממוצע התחזיות' : 'תחזית הבחירות 2026',
		subtitle: has ? `על סמך ${s.n.toLocaleString('he-IL')} תחזיות · הבחירות לכנסת ה-26` : 'הבחירות לכנסת ה-26 · 27.10.2026',
		seats: has ? s.aggregate!.meanAllocation : POLL_AVERAGE,
		footer: 'מה התחזית שלכם?',
		host: new URL(publicOrigin(url)).host
	});
	return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=300' } });
};
