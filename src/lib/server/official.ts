/**
 * Official results from the Central Elections Committee (votes26.bechirot.gov.il).
 *
 * The committee's site sits behind a bot shield that only lets real browsers through, so the site
 * doesn't scrape it itself. Instead a small job (scripts/fetch-official.mjs, run with a real
 * browser) reads the national table and writes it to the bucket as official/latest.json. The site
 * reads that file, allocates seats from the votes, and scores every prediction.
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
	/** the committee's "תוצאות נכון ל-" timestamp, ISO */
	asOf: string;
	fetchedAt: string;
	eligible: number;
	votesCounted: number;
	validVotes: number;
	ballotBoxes: number;
	/** true once the committee publishes the final results */
	final: boolean;
	lists: OfficialList[];
}

/** Ballot letters → our party ids (2026). */
export const LETTERS_TO_ID: Record<string, string> = {
	'מחל': 'likud', 'דרך': 'yashar', 'ודם': 'joint', 'רק': 'together', 'ג': 'utj', 'ל': 'yb', 'אמת': 'democrats',
	'ב': 'otzma', 'שס': 'shas', 'ט': 'rzp', 'עם': 'raam', 'די': 'reservists', 'ך': 'amcha', 'זך': 'haredi', 'ני': 'noam'
};

/** Surplus-vote agreements signed for 2026, by ballot letters (from the committee's list). */
export const SURPLUS_AGREEMENTS_LETTERS: [string, string][] = [
	['רק', 'ל'], // ביחד – ישראל ביתנו
	['דרך', 'אמת'], // ישר! – הדמוקרטים
	['ודם', 'עם'], // הרשימה המשותפת – רע"ם
	['מחל', 'ט'], // הליכוד – הציונות הדתית
	['שס', 'ג'], // ש"ס – יהדות התורה
	['זץ', 'נקי'] // ברית עולם – התיקון לשיטת הבחירות
];

export async function getOfficial(): Promise<OfficialResults | null> {
	return getStore().read<OfficialResults>('official/latest.json');
}

/** Seats per our party id, allocated from the official votes (all lists count toward the threshold). */
export function officialSeats(r: OfficialResults): Record<string, number> {
	const byLetters = allocateKnesset(
		r.lists.map((l) => ({ id: l.letters, votes: l.votes })),
		SURPLUS_AGREEMENTS_LETTERS
	);
	const out: Record<string, number> = {};
	for (const l of r.lists) if (l.id) out[l.id] = byLetters[l.letters] ?? 0;
	return out;
}
