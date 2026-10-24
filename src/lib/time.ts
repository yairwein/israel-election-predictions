export const DEFAULT_ELECTION_AT = '2026-10-27T08:00:00+02:00';

export function defaultLockAt(electionAt: Date): Date {
	return new Date(electionAt.getTime() - 24 * 60 * 60 * 1000);
}

export function isLocked(lockAt: Date, now: Date = new Date()): boolean {
	return now.getTime() >= lockAt.getTime();
}
