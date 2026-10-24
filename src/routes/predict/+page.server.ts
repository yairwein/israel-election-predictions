import type { PageServerLoad } from './$types';
import { getRepo } from '$lib/server/repo';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { me } = await parent();
	const history = locals.uid && me.publicId ? await getRepo().history(locals.uid) : [];
	return { history };
};
