import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sign(payload: string, secret: string): string {
	return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** `<base64url(json)>.<hmac>` – stateless, signed, holds only the Google subject id. */
export function createSessionValue(sub: string, secret: string, now = Date.now()): string {
	const payload = Buffer.from(JSON.stringify({ sub, exp: Math.floor(now / 1000) + SESSION_MAX_AGE })).toString('base64url');
	return `${payload}.${sign(payload, secret)}`;
}

export function readSessionValue(value: string | undefined, secret: string, now = Date.now()): string | null {
	if (!value) return null;
	const [payload, sig] = value.split('.');
	if (!payload || !sig) return null;
	const a = Buffer.from(sig);
	const b = Buffer.from(sign(payload, secret));
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	try {
		const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		if (typeof data.sub !== 'string' || typeof data.exp !== 'number') return null;
		if (data.exp * 1000 < now) return null;
		return data.sub;
	} catch {
		return null;
	}
}

export function setSessionCookie(cookies: Cookies, sub: string, secret: string, secure: boolean) {
	cookies.set(SESSION_COOKIE, createSessionValue(sub, secret), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: SESSION_MAX_AGE
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
