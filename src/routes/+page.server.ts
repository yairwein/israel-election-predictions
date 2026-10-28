import type { PageServerLoad } from './$types';
import { getSummary, publicSummary } from '$lib/server/aggregate';
import { getOfficial } from '$lib/server/official';

export const load: PageServerLoad = async ({ depends }) => {
	depends('app:summary');
	const official = await getOfficial().catch(() => null);
	return { summary: publicSummary(await getSummary()), hasResults: !!official, resultsFinal: official?.final ?? false };
};
