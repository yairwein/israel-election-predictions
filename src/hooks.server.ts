import type { Handle, HandleServerError } from '@sveltejs/kit';
import { SESSION_COOKIE, readSessionValue } from '$lib/server/session';
import { isDevMode, sessionSecret, lockAt } from '$lib/server/config';
import { uidFor } from '$lib/server/predictions';
import { DEV_SUB } from '$lib/server/dev';

console.log(`[startup] lock at ${lockAt().toISOString()}${isDevMode() ? ' — DEV MODE: login optional' : ''}`);

/** Paths that accept cross-site form posts. Each one must do its own CSRF check. */
const CROSS_SITE_FORM_PATHS = new Set(['/api/auth/google/redirect']);

function isFormPost(request: Request): boolean {
	if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return false;
	const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
	return type === 'application/x-www-form-urlencoded' || type === 'multipart/form-data' || type === 'text/plain';
}

export const handle: Handle = async ({ event, resolve }) => {
	// Same rule as SvelteKit's built-in check: a form post must come from our own origin,
	// except Google's redirect sign-in, which is protected by Google's double-submit CSRF token.
	if (isFormPost(event.request) && !CROSS_SITE_FORM_PATHS.has(event.url.pathname)) {
		const origin = event.request.headers.get('origin');
		if (origin !== event.url.origin) {
			return new Response(`Cross-site ${event.request.method} form submissions are forbidden`, { status: 403 });
		}
	}

	const secret = sessionSecret();
	const sub = readSessionValue(event.cookies.get(SESSION_COOKIE), secret);
	event.locals.uid = sub ? uidFor(sub, secret) : null;
	event.locals.devUser = false;

	// Dev mode: signing in is optional; without a session you are the local test voter.
	if (!event.locals.uid && isDevMode()) {
		event.locals.uid = uidFor(DEV_SUB, secret);
		event.locals.devUser = true;
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	// Google Identity Services needs popups to talk back to the opener.
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
	return response;
};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	if (status >= 500) console.error(`[${status}] ${event.request.method} ${event.url.pathname}: ${message}`, error);
	return { message };
};
