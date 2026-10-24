import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCode } from '$lib/server/google';
import { getRepo } from '$lib/server/repo';
import { uidFor } from '$lib/server/predictions';
import { sessionSecret, googleClientSecret, publicOrigin } from '$lib/server/config';
import { setSessionCookie } from '$lib/server/session';
import { rateLimit } from '$lib/server/http';

/**
 * Google sends the browser back here (a normal GET, so our cookies come along) with ?code&state.
 * Check state against the cookie, exchange the code, sign in, return to the saved page.
 */
export const GET: RequestHandler = async ({ url, cookies, getClientAddress }) => {
	rateLimit(`auth:${getClientAddress()}`, 20, 60_000);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expected = cookies.get('oauth_state');
	const back = cookies.get('oauth_next') ?? '/predict';
	cookies.delete('oauth_state', { path: '/api/auth/google' });
	cookies.delete('oauth_next', { path: '/api/auth/google' });

	if (!code || !state || !expected || state !== expected) redirect(303, '/?signin=failed');
	try {
		const identity = await exchangeCode(code, publicOrigin(url), googleClientSecret());
		const secret = sessionSecret();
		await getRepo().ensureUser(uidFor(identity.sub, secret), identity.email);
		setSessionCookie(cookies, identity.sub, secret, url.protocol === 'https:');
	} catch (e) {
		console.warn('[auth] oauth redirect failed:', (e as Error).message);
		redirect(303, '/?signin=failed');
	}
	redirect(303, back.startsWith('/') && !back.startsWith('//') ? back : '/predict');
};
