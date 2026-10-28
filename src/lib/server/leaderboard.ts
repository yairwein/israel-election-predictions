import { getRepo } from './repo';
import { getVotes26 } from './votes26';
import { computeAggregate } from '$lib/model';
import { PARTY_IDS } from '$lib/parties';
import { seatError, rankByScore } from '$lib/score';

/** projected: Votes26's forecast of the final seats (default). counted: seats from the official count so far. */
export type LeaderSource = 'projected' | 'counted';

export interface LeaderRow { rank: number; nickname: string; publicId: string; score: number; updatedAt: string }

export interface Leaderboard {
	source: LeaderSource;
	updatedAt: string;
	stations: number;
	stationsTotal: number;
	validVotes: number;
	final: boolean;
	seats: Record<string, number>;
	rows: LeaderRow[];
	/** the crowd's average forecast (as shown on the site), scored the same way */
	average: { score: number; rankAmong: number; beats: number };
	n: number;
}

const cache: Partial<Record<LeaderSource, { at: number; key: string; value: Leaderboard }>> = {};

export async function getLeaderboard(source: LeaderSource = 'projected'): Promise<Leaderboard | null> {
	const v = await getVotes26();
	if (!v) return null;
	const c = cache[source];
	if (c && c.key === v.updatedAt && Date.now() - c.at < 60_000) return c.value;
	const seats = source === 'counted' ? v.counted : v.projected;
	const preds = await getRepo().counted();
	const ranked = rankByScore(preds, (p) => seatError(p.seats, seats, PARTY_IDS));
	const avgScore = seatError(computeAggregate(preds).meanAllocation, seats, PARTY_IDS);
	const value: Leaderboard = {
		source,
		updatedAt: v.updatedAt,
		stations: v.stations,
		stationsTotal: v.stationsTotal,
		validVotes: v.validVotes,
		final: v.final,
		seats,
		rows: ranked.map((r) => ({ rank: r.rank, nickname: r.item.nickname, publicId: r.item.publicId, score: r.score, updatedAt: r.item.updatedAt })),
		average: { score: avgScore, rankAmong: ranked.filter((r) => r.score < avgScore).length + 1, beats: ranked.filter((r) => r.score > avgScore).length },
		n: ranked.length
	};
	cache[source] = { at: Date.now(), key: v.updatedAt, value };
	return value;
}
