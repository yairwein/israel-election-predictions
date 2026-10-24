import { publicOrigin } from '$lib/server/config';
import type { PageServerLoad } from './$types';
import { getRepo } from '$lib/server/repo';

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { me } = await parent();
	const history = locals.uid && me.publicId ? await getRepo().history(locals.uid) : [];
	return { history, origin: publicOrigin(url) };
};
