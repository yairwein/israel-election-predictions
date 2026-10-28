import type { PageServerLoad } from './$types';
import { getLeaderboard, type LeaderSource } from '$lib/server/leaderboard';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { me } = await parent();
	const source: LeaderSource = url.searchParams.get('by') === 'votes26' ? 'votes26' : 'official';
	const lb = await getLeaderboard(source);
	return {
		lb,
		source,
		myPublicId: me.publicId,
		og: { title: 'טבלת המנחשים · תחזית הבחירות 2026', path: '/leaderboard' }
	};
};
