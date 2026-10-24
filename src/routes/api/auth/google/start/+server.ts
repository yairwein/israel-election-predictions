import { redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import type { RequestHandler } from './$types';
import { authUrl } from '$lib/server/google';
import { publicOrigin } from '$lib/server/config';

/** Starts the standard OAuth redirect: remember a random state and where to come back, go to Google. */
export const GET: RequestHandler = ({ url, cookies }) => {
	const state = randomBytes(18).toString('base64url');
	const next = url.searchParams.get('next') ?? '/predict';
	const back = next.startsWith('/') && !next.startsWith('//') ? next : '/predict';
	const opts = { path: '/api/auth/google', httpOnly: true, sameSite: 'lax' as const, secure: url.protocol === 'https:', maxAge: 900 };
	cookies.set('oauth_state', state, opts);
	cookies.set('oauth_next', back, opts);
	redirect(302, authUrl(publicOrigin(url), state));
};
