import type { PageServerLoad } from './$types';
import { getLeaderboard } from '$lib/server/leaderboard';

export const load: PageServerLoad = async ({ parent }) => {
	const { me } = await parent();
	return {
		lb: await getLeaderboard(),
		myPublicId: me.publicId,
		og: { title: 'טבלת המנחשים · תחזית הבחירות 2026', path: '/leaderboard' }
	};
};
