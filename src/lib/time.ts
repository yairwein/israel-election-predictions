/** Polls open Tue 27 Oct 2026 at 07:00 Israel time (UTC+2, winter time). */
export const DEFAULT_ELECTION_AT = '2026-10-27T07:00:00+02:00';

/** Predictions lock 12 hours before the polls open: Mon 26 Oct 19:00. */
export const LOCK_HOURS_BEFORE = 12;

export function defaultLockAt(electionAt: Date): Date {
	return new Date(electionAt.getTime() - LOCK_HOURS_BEFORE * 60 * 60 * 1000);
}

export function isLocked(lockAt: Date, now: Date = new Date()): boolean {
	return now.getTime() >= lockAt.getTime();
}
