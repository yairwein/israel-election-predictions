/**
 * Votes26 (votes26.com) live seat projection, from its open read API. Used as a second, optional
 * reference for the leaderboard. Same ballot letters as the official results.
 */
import { LETTERS_TO_ID } from './official';

export interface Votes26 {
	updatedAt: string;
	stations: number;
	stationsTotal: number;
	official: boolean;
	seats: Record<string, number>;
}

const API = 'https://votes26.com/api/v1/elections/26/live';
let cache: { at: number; value: Votes26 | null } | null = null;

interface V26Party { code: string; seats: number }
interface V26Checkpoint { stations: number; parties: V26Party[] }
interface V26Live { updated_at_utc: string; stations_total: number; is_official_result: boolean; publishable: boolean; checkpoints: V26Checkpoint[] }

export async function getVotes26(): Promise<Votes26 | null> {
	if (cache && Date.now() - cache.at < 120_000) return cache.value;
	let value: Votes26 | null = null;
	try {
		const res = await fetch(API, { headers: { accept: 'application/json', 'user-agent': 'elections.yairwein.com leaderboard' }, signal: AbortSignal.timeout(8000) });
		if (res.ok) {
			const d = (await res.json()) as V26Live;
			const cp = d.checkpoints?.at(-1);
			if (d.publishable && cp?.parties?.length) {
				const seats: Record<string, number> = {};
				for (const p of cp.parties) {
					const id = LETTERS_TO_ID[p.code];
					if (id) seats[id] = Number(p.seats) || 0;
				}
				const total = Object.values(seats).reduce((a, b) => a + b, 0);
				if (total >= 110 && total <= 120) {
					value = { updatedAt: d.updated_at_utc, stations: cp.stations, stationsTotal: d.stations_total, official: d.is_official_result, seats };
				}
			}
		}
	} catch (e) {
		console.warn('[votes26] fetch failed:', (e as Error).message);
	}
	// keep the last good value if this fetch failed
	if (!value && cache?.value) value = cache.value;
	cache = { at: Date.now(), value };
	return value;
}
