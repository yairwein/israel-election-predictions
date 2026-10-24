import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyGoogleIdToken } from '$lib/server/google';
import { getRepo } from '$lib/server/repo';
import { uidFor } from '$lib/server/predictions';
import { sessionSecret } from '$lib/server/config';
import { setSessionCookie } from '$lib/server/session';
import { rateLimit } from '$lib/server/http';

/**
 * Sign-in by redirect (used inside in-app browsers like X, where the Google popup can't report back).
 * Google posts the ID token here as a form: `credential` and `g_csrf_token`, with the same
 * `g_csrf_token` set as a cookie on our domain (double-submit check). Then we go back to the page
 * saved in the signin_next cookie. The URL itself has no query string: Google matches it exactly
 * against the registered redirect URI.
 */
export const POST: RequestHandler = async ({ request, cookies, url, getClientAddress }) => {
	rateLimit(`auth:${getClientAddress()}`, 20, 60_000);
	const form = await request.formData();
	const credential = form.get('credential');
	const csrfBody = form.get('g_csrf_token');
	const csrfCookie = cookies.get('g_csrf_token');
	if (typeof credential !== 'string' || !credential) error(400, 'missing credential');
	if (!csrfCookie || typeof csrfBody !== 'string' || csrfBody !== csrfCookie) error(400, 'bad CSRF token');

	try {
		const identity = await verifyGoogleIdToken(credential);
		const secret = sessionSecret();
		await getRepo().ensureUser(uidFor(identity.sub, secret), identity.email);
		setSessionCookie(cookies, identity.sub, secret, url.protocol === 'https:');
	} catch (e) {
		console.warn('[auth] redirect token rejected:', (e as Error).message);
		redirect(303, '/?signin=failed');
	}

	// Back to where they started: a same-site path from the signin_next cookie, else the prediction form.
	let back = '/predict';
	try {
		const c = decodeURIComponent(cookies.get('signin_next') ?? '');
		if (c.startsWith('/') && !c.startsWith('//')) back = c;
	} catch {
		/* malformed cookie: use the default */
	}
	cookies.delete('signin_next', { path: '/api/auth/google' });
	redirect(303, back);
};
