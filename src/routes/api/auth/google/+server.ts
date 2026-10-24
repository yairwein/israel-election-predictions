import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyGoogleIdToken } from '$lib/server/google';
import { getRepo } from '$lib/server/repo';
import { uidFor } from '$lib/server/predictions';
import { sessionSecret } from '$lib/server/config';
import { setSessionCookie } from '$lib/server/session';
import { readJson, rateLimit } from '$lib/server/http';

/** Exchanges a Google ID token for our own signed session cookie. */
export const POST: RequestHandler = async ({ request, cookies, url, getClientAddress }) => {
	rateLimit(`auth:${getClientAddress()}`, 20, 60_000);
	const body = await readJson(request);
	if (typeof body.credential !== 'string') error(400, { message: 'missing credential', code: 'bad_request' });
	let identity;
	try {
		identity = await verifyGoogleIdToken(body.credential);
	} catch (e) {
		console.warn('[auth] token rejected:', (e as Error).message);
		error(401, { message: 'ההתחברות עם Google נכשלה', code: 'unauthorized' });
	}
	const secret = sessionSecret();
	const user = await getRepo().ensureUser(uidFor(identity.sub, secret), identity.email);
	setSessionCookie(cookies, identity.sub, secret, url.protocol === 'https:');
	return json({ ok: true, nickname: user.nickname });
};
