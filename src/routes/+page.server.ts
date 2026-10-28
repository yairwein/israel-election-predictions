import type { PageServerLoad } from './$types';
import { getSummary, publicSummary } from '$lib/server/aggregate';
import { getVotes26 } from '$lib/server/votes26';

export const load: PageServerLoad = async ({ depends }) => {
	depends('app:summary');
	const v26 = await getVotes26().catch(() => null);
	return { summary: publicSummary(await getSummary()), hasResults: !!v26, resultsFinal: v26?.final ?? false };
};
