import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepo } from '$lib/server/repo';
import { uidFor } from '$lib/server/predictions';
import { isDevMode, sessionSecret } from '$lib/server/config';
import { setSessionCookie } from '$lib/server/session';
import { readJson } from '$lib/server/http';

/** Dev mode only: sign in as an arbitrary test voter, to simulate many people. */
export const POST: RequestHandler = async ({ request, cookies, url }) => {
	if (!isDevMode()) error(404, { message: 'Not found' });
	const body = await readJson(request);
	const name = typeof body.name === 'string' ? body.name.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40) : '';
	if (!name) error(400, { message: 'name required', code: 'bad_request' });
	const sub = `dev:${name}`;
	const secret = sessionSecret();
	const user = await getRepo().ensureUser(uidFor(sub, secret), `${name}@dev.local`);
	setSessionCookie(cookies, sub, secret, url.protocol === 'https:');
	return json({ ok: true, nickname: user.nickname });
};
