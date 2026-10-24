import { publicOrigin } from '$lib/server/config';
import type { LayoutServerLoad } from './$types';
import { meView, appConfig } from '$lib/server/me';

export const load: LayoutServerLoad = async ({ locals, depends, url }) => {
	depends('app:me');
	return { me: await meView(locals), config: appConfig(), origin: publicOrigin(url) };
};
