/**
 * Official results of the Central Elections Committee (votes26.bechirot.gov.il/nationalresults),
 * loaded by hand into the bucket as official/results.json (scripts/load-official.mjs). The committee's
 * site only serves real browsers, so the site doesn't fetch it itself.
 */
import { getStore } from './storage';
import { allocateKnesset } from '$lib/seats';

export interface OfficialList {
	/** our party id, or null for lists we don't track */
	id: string | null;
	name: string;
	letters: string;
	votes: number;
}

export interface OfficialResults {
	/** the committee's "תוצאות נכון ל-" time (ISO, Israel time) */
	asOf: string;
	source: string;
	/** true once these are the final results published in Reshumot */
	final: boolean;
	eligible: number;
	votesCast: number;
	validVotes: number;
	invalidVotes: number;
	ballotBoxesCounted: number;
	/** approximate total number of ballot boxes (the committee's page shows only the counted ones) */
	ballotBoxesTotal: number | null;
	lists: OfficialList[];
}

/** Surplus-vote agreements signed for 2026, by ballot letters. */
export const SURPLUS_AGREEMENTS_LETTERS: [string, string][] = [
	['רק', 'ל'], ['דרך', 'אמת'], ['ודם', 'עם'], ['מחל', 'ט'], ['שס', 'ג'], ['זץ', 'נקי']
];

let cache: { at: number; value: OfficialResults | null } | null = null;

export async function getOfficial(): Promise<OfficialResults | null> {
	if (cache && Date.now() - cache.at < 60_000) return cache.value;
	const value = await getStore().read<OfficialResults>('official/results.json');
	cache = { at: Date.now(), value };
	return value;
}

/** Seats per our party id, allocated from the official votes (all lists count toward the threshold). */
export function officialSeats(r: OfficialResults): Record<string, number> {
	const byLetters = allocateKnesset(r.lists.map((l) => ({ id: l.letters, votes: l.votes })), SURPLUS_AGREEMENTS_LETTERS);
	const out: Record<string, number> = {};
	for (const l of r.lists) if (l.id) out[l.id] = byLetters[l.letters] ?? 0;
	return out;
}

/** Turnout in percent: votes cast ÷ eligible voters. */
export function officialTurnout(r: OfficialResults): number {
	return r.eligible ? (r.votesCast / r.eligible) * 100 : 0;
}
