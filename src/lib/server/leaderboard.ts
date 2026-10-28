import { getRepo } from './repo';
import { getOfficial, officialSeats, type OfficialResults } from './official';
import { computeAggregate } from '$lib/model';
import { PARTY_IDS } from '$lib/parties';
import { seatError, rankByScore } from '$lib/score';
import { getVotes26 } from './votes26';

export interface LeaderRow {
	rank: number;
	nickname: string;
	publicId: string;
	score: number;
	updatedAt: string;
}

export type LeaderSource = 'official' | 'votes26';

export interface Leaderboard {
	source: LeaderSource;
	official: Pick<OfficialResults, 'asOf' | 'final' | 'validVotes' | 'votesCounted' | 'eligible' | 'ballotBoxes'>;
	/** present when source is votes26 */
	votes26?: { updatedAt: string; stations: number; stationsTotal: number };
	/** seats per party, allocated from the official votes so far */
	seats: Record<string, number>;
	rows: LeaderRow[];
	/** the crowd's average forecast (as shown on the site), scored the same way */
	average: { score: number; rankAmong: number; beats: number };
	n: number;
}

const cache: Partial<Record<LeaderSource, { at: number; value: Leaderboard | null }>> = {};

/** Scores every counted prediction against seats from the chosen source (official count, or Votes26's projection). */
export async function getLeaderboard(source: LeaderSource = 'official'): Promise<Leaderboard | null> {
	const c = cache[source];
	if (c && Date.now() - c.at < 60_000) return c.value;
	const off = await getOfficial();
	let seats: Record<string, number> | null = null;
	let v26info: Leaderboard['votes26'];
	if (source === 'official') {
		if (off) seats = officialSeats(off);
	} else {
		const v = await getVotes26();
		if (v) {
			seats = v.seats;
			v26info = { updatedAt: v.updatedAt, stations: v.stations, stationsTotal: v.stationsTotal };
		}
	}
	if (!seats || !off) {
		cache[source] = { at: Date.now(), value: null };
		return null;
	}
	const preds = await getRepo().counted();
	const ranked = rankByScore(preds, (p) => seatError(p.seats, seats!, PARTY_IDS));
	const avgSeats = computeAggregate(preds).meanAllocation;
	const avgScore = seatError(avgSeats, seats, PARTY_IDS);
	const value: Leaderboard = {
		source,
		official: { asOf: off.asOf, final: off.final, validVotes: off.validVotes, votesCounted: off.votesCounted, eligible: off.eligible, ballotBoxes: off.ballotBoxes },
		votes26: v26info,
		seats,
		rows: ranked.map((r) => ({ rank: r.rank, nickname: r.item.nickname, publicId: r.item.publicId, score: r.score, updatedAt: r.item.updatedAt })),
		average: { score: avgScore, rankAmong: ranked.filter((r) => r.score < avgScore).length + 1, beats: ranked.filter((r) => r.score > avgScore).length },
		n: ranked.length
	};
	cache[source] = { at: Date.now(), value };
	return value;
}
