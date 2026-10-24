import { PARTY_IDS, TOTAL_SEATS, MIN_SEATS, type Seats } from './parties';

export type SeatsResult = { ok: true; seats: Seats } | { ok: false; error: string };

/** Validates a full prediction: every party present, integers, 0 or ≥ MIN_SEATS, total 120. */
export function validateSeats(input: unknown): SeatsResult {
	if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'seats_missing' };
	const obj = input as Record<string, unknown>;
	const keys = Object.keys(obj);
	for (const k of keys) if (!PARTY_IDS.includes(k)) return { ok: false, error: 'unknown_party' };
	const seats: Seats = {};
	let total = 0;
	for (const id of PARTY_IDS) {
		const v = obj[id] ?? 0;
		if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > TOTAL_SEATS) return { ok: false, error: 'invalid_value' };
		if (v > 0 && v < MIN_SEATS) return { ok: false, error: 'below_threshold' };
		seats[id] = v;
		total += v;
	}
	if (total !== TOTAL_SEATS) return { ok: false, error: 'total_not_120' };
	return { ok: true, seats };
}

/** Normalizes and validates a nickname. Returns null if invalid. */
export function cleanNickname(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const s = raw.normalize('NFKC').replace(/\s+/g, ' ').trim();
	if (s.length < 2 || s.length > 24) return null;
	if (!/^[\p{L}\p{M}\p{N} _.\-'״׳"]+$/u.test(s)) return null;
	if (!/[\p{L}\p{N}]/u.test(s)) return null;
	return s;
}

export function nicknameKey(nick: string): string {
	return nick.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}
