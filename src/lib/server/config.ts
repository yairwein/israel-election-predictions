import { env } from '$env/dynamic/private';
import { DEFAULT_ELECTION_AT, defaultLockAt } from '$lib/time';

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

export function electionAt(): Date {
	return parseDate(env.ELECTION_AT) ?? new Date(DEFAULT_ELECTION_AT);
}

/** Predictions lock exactly 24 hours before the election starts, unless LOCK_AT is set. */
export function lockAt(): Date {
	return parseDate(env.LOCK_AT) ?? defaultLockAt(electionAt());
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

export function googleClientId(): string {
	return env.GOOGLE_CLIENT_ID ?? '';
}
