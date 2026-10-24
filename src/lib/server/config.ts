import { env } from '$env/dynamic/private';

function parseDate(v: string | undefined): Date | null {
	if (!v) return null;
	const d = new Date(v);
	return Number.isNaN(d.getTime()) ? null : d;
}

let warnedCloudRun = false;

/**
 * Dev mode (NODE_ENV=dev or development, which `vite dev` sets): login is skipped and every
 * request is signed in as a local test voter. Refused on Cloud Run (K_SERVICE is set there).
 */
export function isDevMode(): boolean {
	const v = (env.NODE_ENV ?? '').toLowerCase();
	if (v !== 'dev' && v !== 'development') return false;
	if (env.K_SERVICE) {
		if (!warnedCloudRun) console.error('[config] NODE_ENV=dev ignored on Cloud Run: login is required.');
		warnedCloudRun = true;
		return false;
	}
	return true;
}

function requiredDate(name: 'ELECTION_AT' | 'LOCK_AT'): Date {
	const d = parseDate(env[name]);
	if (!d) throw new Error(`${name} is required (ISO 8601 with offset, e.g. 2026-10-27T07:00:00+02:00)`);
	return d;
}

/** When the polls open. Required. */
export function electionAt(): Date {
	return requiredDate('ELECTION_AT');
}

/** When predictions lock. Required. */
export function lockAt(): Date {
	return requiredDate('LOCK_AT');
}

/** Optional: hide the totals until this time (e.g. when the polls close). */
export function resultsHiddenUntil(): Date | null {
	return parseDate(env.RESULTS_HIDDEN_UNTIL);
}

export function resultsHidden(now = new Date()): boolean {
	const until = resultsHiddenUntil();
	return !!until && now < until;
}

export function sessionSecret(): string {
	const s = env.SESSION_SECRET ?? '';
	if (s.length >= 16) return s;
	if (isDevMode()) return 'dev-only-insecure-session-secret';
	throw new Error('SESSION_SECRET (16+ characters) is required outside dev mode');
}

/** Google Analytics 4 measurement id (G-XXXX). Not loaded in dev mode. */
export function gaMeasurementId(): string {
	const id = (env.GA_MEASUREMENT_ID ?? '').trim();
	return /^G-[A-Z0-9]{4,20}$/.test(id) && !isDevMode() ? id : '';
}

/**
 * Public origin for absolute URLs (share links, og:image). PUBLIC_ORIGIN wins; otherwise the
 * request origin, with https assumed for any non-local host (Cloud Run and tunnels end TLS upstream).
 */
export function publicOrigin(url: URL): string {
	const fixed = (env.PUBLIC_ORIGIN ?? '').trim().replace(/\/$/, '');
	if (fixed) return fixed;
	// adapter-node reports https unless told otherwise, so decide by host: local is plain http.
	const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname);
	return `${local ? 'http:' : 'https:'}//${url.host}`;
}

/** OAuth client secret, for the redirect sign-in used in in-app browsers. Optional: without it that flow is off. */
export function googleClientSecret(): string {
	return env.GOOGLE_CLIENT_SECRET ?? '';
}

export function googleClientId(): string {
	return env.GOOGLE_CLIENT_ID ?? '';
}
