import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authUrl, signState } from '$lib/server/google';
import { publicOrigin, sessionSecret } from '$lib/server/config';

/**
 * Starts the standard OAuth redirect. The state is self-contained and signed (where to come back +
 * expiry), so it works even where in-app browsers drop our cookies on the round trip to Google.
 */
export const GET: RequestHandler = ({ url }) => {
	const next = url.searchParams.get('next') ?? '/predict';
	const back = next.startsWith('/') && !next.startsWith('//') ? next : '/predict';
	redirect(302, authUrl(publicOrigin(url), signState(back, sessionSecret())));
};
