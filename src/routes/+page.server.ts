import type { PageServerLoad } from './$types';
import { getSummary, publicSummary } from '$lib/server/aggregate';

export const load: PageServerLoad = async ({ depends }) => {
	depends('app:summary');
	return { summary: publicSummary(await getSummary()) };
};
