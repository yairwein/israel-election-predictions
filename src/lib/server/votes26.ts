/**
 * Votes26 (votes26.com) live data, from its open read API — the leaderboard's only source.
 * One request gives both:
 *  - the official count so far (each list's share of the valid votes counted, ballot boxes counted)
 *  - Votes26's projection of the final seats
 * Same ballot letters as the Central Elections Committee.
 */
import { allocateKnesset } from '$lib/seats';

/** Ballot letters → our party ids (2026). */
export const LETTERS_TO_ID: Record<string, string> = {
	'מחל': 'likud', 'דרך': 'yashar', 'ודם': 'joint', 'רק': 'together', 'ג': 'utj', 'ל': 'yb', 'אמת': 'democrats',
	'ב': 'otzma', 'שס': 'shas', 'ט': 'rzp', 'עם': 'raam', 'די': 'reservists', 'ך': 'amcha', 'זך': 'haredi', 'ני': 'noam'
};

/** Surplus-vote agreements signed for 2026, by ballot letters. */
export const SURPLUS_AGREEMENTS_LETTERS: [string, string][] = [
	['רק', 'ל'], ['דרך', 'אמת'], ['ודם', 'עם'], ['מחל', 'ט'], ['שס', 'ג'], ['זץ', 'נקי']
];

export interface Votes26 {
	updatedAt: string;
	stations: number;
	stationsTotal: number;
	validVotes: number;
	/** true once Votes26 marks the data as the official final result */
	final: boolean;
	/** Votes26's projected final seats */
	projected: Record<string, number>;
	/** seats allocated from the official count so far (Votes26's shares × valid votes, rounded) */
	counted: Record<string, number>;
}

const API = 'https://votes26.com/api/v1/elections/26/live';
let cache: { at: number; value: Votes26 | null } | null = null;

interface V26Party { code: string; seats: number; obs: number }
interface V26Checkpoint { stations: number; validObs: number; parties: V26Party[] }
interface V26Live { updated_at_utc: string; stations_total: number; is_official_result: boolean; publishable: boolean; checkpoints: V26Checkpoint[] }

export function parseVotes26(d: V26Live): Votes26 | null {
	const cp = d.checkpoints?.at(-1);
	if (!d.publishable || !cp?.parties?.length) return null;
	const projected: Record<string, number> = {};
	for (const p of cp.parties) {
		const id = LETTERS_TO_ID[p.code];
		if (id) projected[id] = Number(p.seats) || 0;
	}
	const total = Object.values(projected).reduce((a, b) => a + b, 0);
	if (total < 110 || total > 120) return null;

	// official count: every list's votes ≈ share × valid votes (shares are rounded to 0.01%)
	const valid = Number(cp.validObs) || 0;
	const lists = cp.parties.map((p) => ({ id: p.code, votes: Math.round((Number(p.obs) || 0) * valid) }));
	const byLetters = valid > 0 ? allocateKnesset(lists, SURPLUS_AGREEMENTS_LETTERS) : {};
	const counted: Record<string, number> = {};
	for (const [code, id] of Object.entries(LETTERS_TO_ID)) counted[id] = byLetters[code] ?? 0;

	return {
		updatedAt: d.updated_at_utc,
		stations: cp.stations,
		stationsTotal: d.stations_total,
		validVotes: valid,
		final: !!d.is_official_result,
		projected,
		counted
	};
}

export async function getVotes26(): Promise<Votes26 | null> {
	if (cache && Date.now() - cache.at < 120_000) return cache.value;
	let value: Votes26 | null = null;
	try {
		const res = await fetch(API, { headers: { accept: 'application/json', 'user-agent': 'elections.yairwein.com leaderboard' }, signal: AbortSignal.timeout(8000) });
		if (res.ok) value = parseVotes26((await res.json()) as V26Live);
	} catch (e) {
		console.warn('[votes26] fetch failed:', (e as Error).message);
	}
	if (!value && cache?.value) value = cache.value; // keep the last good data if this fetch failed
	cache = { at: Date.now(), value };
	return value;
}
