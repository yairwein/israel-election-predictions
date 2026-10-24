import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCode, readState } from '$lib/server/google';
import { getRepo } from '$lib/server/repo';
import { uidFor } from '$lib/server/predictions';
import { sessionSecret, googleClientSecret, publicOrigin } from '$lib/server/config';
import { setSessionCookie } from '$lib/server/session';
import { rateLimit } from '$lib/server/http';

/**
 * Google sends the browser back here with ?code&state. Verify the signed state, exchange the code
 * (only our server can, with the client secret), sign in, return to the page saved in the state.
 */
export const GET: RequestHandler = async ({ url, cookies, getClientAddress }) => {
	rateLimit(`auth:${getClientAddress()}`, 20, 60_000);
	const secret = sessionSecret();
	const code = url.searchParams.get('code');
	const back = readState(url.searchParams.get('state'), secret);
	if (!code || !back) {
		console.warn(`[auth] oauth redirect rejected: ${!code ? `no code (${url.searchParams.get('error') ?? 'no error param'})` : 'bad or expired state'}`);
		redirect(303, '/?signin=failed');
	}
	try {
		const identity = await exchangeCode(code, publicOrigin(url), googleClientSecret());
		await getRepo().ensureUser(uidFor(identity.sub, secret), identity.email);
		setSessionCookie(cookies, identity.sub, secret, url.protocol === 'https:');
	} catch (e) {
		console.warn('[auth] oauth redirect failed:', (e as Error).message);
		redirect(303, '/?signin=failed');
	}
	redirect(303, back);
};
