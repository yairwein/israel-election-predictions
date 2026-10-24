import { OAuth2Client } from 'google-auth-library';
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
