import { OAuth2Client } from 'google-auth-library';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { googleClientId } from './config';

let client: OAuth2Client | null = null;

export interface GoogleIdentity {
	sub: string;
	email: string;
}

/** Verifies a Google Identity Services ID token (signature, audience, expiry, verified email). */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
	const audience = googleClientId();
	if (!audience) throw new Error('GOOGLE_CLIENT_ID is not configured');
	client ??= new OAuth2Client(audience);
	const ticket = await client.verifyIdToken({ idToken, audience });
	const p = ticket.getPayload();
	if (!p?.sub) throw new Error('token has no subject');
	if (!p.email || p.email_verified === false) throw new Error('email not verified');
	return { sub: p.sub, email: p.email.toLowerCase() };
}

/**
 * Standard OAuth 2.0 authorization-code flow, for in-app browsers where the Google popup can't work.
 * redirect_uri must be registered exactly in the OAuth client (no query string).
 */
export function oauthRedirectUri(origin: string): string {
	return `${origin}/api/auth/google/redirect`;
}

export function authUrl(origin: string, state: string): string {
	const q = new URLSearchParams({
		client_id: googleClientId(),
		redirect_uri: oauthRedirectUri(origin),
		response_type: 'code',
		scope: 'openid email',
		state,
		prompt: 'select_account'
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/** Exchanges the authorization code for tokens and verifies the ID token. */
export async function exchangeCode(code: string, origin: string, clientSecret: string): Promise<GoogleIdentity> {
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: googleClientId(),
			client_secret: clientSecret,
			redirect_uri: oauthRedirectUri(origin),
			grant_type: 'authorization_code'
		})
	});
	const data = (await res.json()) as { id_token?: string; error?: string; error_description?: string };
	if (!res.ok || !data.id_token) throw new Error(`token exchange failed: ${data.error ?? res.status} ${data.error_description ?? ''}`);
	return verifyGoogleIdToken(data.id_token);
}

/** Signed OAuth state: return path + expiry + random nonce, HMAC'd with our secret. Valid 15 minutes. */
export function signState(back: string, secret: string, now = Date.now()): string {
	const payload = Buffer.from(JSON.stringify({ b: back, e: Math.floor(now / 1000) + 900, n: randomBytes(9).toString('base64url') })).toString('base64url');
	const sig = createHmac('sha256', secret).update(`oauth:${payload}`).digest('base64url');
	return `${payload}.${sig}`;
}

/** Returns the safe return path from a valid state, or null. */
export function readState(state: string | null, secret: string, now = Date.now()): string | null {
	if (!state) return null;
	const [payload, sig] = state.split('.');
	if (!payload || !sig) return null;
	const want = Buffer.from(createHmac('sha256', secret).update(`oauth:${payload}`).digest('base64url'));
	const got = Buffer.from(sig);
	if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
	try {
		const d = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		if (typeof d.e !== 'number' || d.e * 1000 < now) return null;
		const b = typeof d.b === 'string' ? d.b : '/predict';
		return b.startsWith('/') && !b.startsWith('//') ? b : '/predict';
	} catch {
		return null;
	}
}
