import { publicOrigin } from '$lib/server/config';
import type { PageServerLoad } from './$types';
import { getSummary, publicSummary } from '$lib/server/aggregate';
import { getRepo } from '$lib/server/repo';
import { sumOf, getScenarios } from '$lib/parties';

export const load: PageServerLoad = async ({ depends, url }) => {
	depends('app:summary');
	const summary = publicSummary(await getSummary());
	let recent: { nickname: string; coalition: number; coalitionCore: number; opposition: number; arab: number; updatedAt: string }[] = [];
	if (!summary.hidden) {
		const [withAmcha, withoutAmcha] = getScenarios();
		recent = (await getRepo().all())
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
			.slice(0, 30)
			.map((p) => ({
				nickname: p.nickname,
				coalition: sumOf(p.seats, withAmcha.coalition),
				coalitionCore: sumOf(p.seats, withoutAmcha.coalition),
				opposition: sumOf(p.seats, withAmcha.opposition),
				arab: sumOf(p.seats, withAmcha.arab),
				updatedAt: p.updatedAt
			}));
	}
	return {
		summary,
		recent,
		origin: publicOrigin(url),
		og: { title: 'ממוצע התחזיות · תחזית הבחירות 2026', image: '/og/average', path: '/results' }
	};
};
