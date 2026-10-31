import { getRepo } from './repo';
import { getOfficial, officialSeats, officialTurnout, type OfficialResults } from './official';
import { computeAggregate } from '$lib/model';
import { PARTY_IDS } from '$lib/parties';
import { seatError, rankPredictions } from '$lib/score';

export interface LeaderRow {
	rank: number;
	nickname: string;
	publicId: string;
	score: number;
	turnout: number | null;
	turnoutGap: number | null;
	lockedAt: string;
}

export interface Leaderboard {
	official: Omit<OfficialResults, 'lists' | 'source'> & { turnout: number };
	seats: Record<string, number>;
	rows: LeaderRow[];
	/** the crowd's average forecast (as shown on the site), scored the same way */
	average: { score: number; turnout: number | null; rankAmong: number; beats: number };
	n: number;
}

let cache: { at: number; key: string; value: Leaderboard } | null = null;

export async function getLeaderboard(): Promise<Leaderboard | null> {
	const off = await getOfficial();
	if (!off) return null;
	const key = `${off.asOf}|${off.validVotes}|${off.final}`;
	if (cache && cache.key === key && Date.now() - cache.at < 60_000) return cache.value;

	const seats = officialSeats(off);
	const turnout = officialTurnout(off);
	const preds = await getRepo().counted();
	const ranked = rankPredictions(preds, (p) => seatError(p.seats, seats, PARTY_IDS), turnout);
	const agg = computeAggregate(preds);
	const avgScore = seatError(agg.meanAllocation, seats, PARTY_IDS);
	const { lists: _lists, source: _source, ...meta } = off;
	const value: Leaderboard = {
		official: { ...meta, turnout },
		seats,
		rows: ranked.map((r) => ({
			rank: r.rank,
			nickname: r.item.nickname,
			publicId: r.item.publicId,
			score: r.score,
			turnout: r.item.turnout,
			turnoutGap: r.turnoutGap,
			lockedAt: r.item.updatedAt
		})),
		average: {
			score: avgScore,
			turnout: agg.turnout?.mean ?? null,
			rankAmong: ranked.filter((r) => r.score < avgScore).length + 1,
			beats: ranked.filter((r) => r.score > avgScore).length
		},
		n: ranked.length
	};
	cache = { at: Date.now(), key, value };
	return value;
}
