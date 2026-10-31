import { describe, it, expect } from 'vitest';
import { seatError, rankPredictions } from '../lib/score';

describe('leaderboard scoring', () => {
	it('sums absolute seat differences', () => {
		expect(seatError({ a: 30, b: 20 }, { a: 28, b: 23 }, ['a', 'b'])).toBe(5);
		expect(seatError({ a: 30 }, { a: 30, b: 0 }, ['a', 'b'])).toBe(0);
	});
	it('ranks by score, then closest turnout (tb1), then first to lock in (tb2)', () => {
		const actual = 78;
		const r = rankPredictions(
			[
				{ n: 'late-close', score: 4, turnout: 77.5, updatedAt: '2026-10-25T10:00:00Z' },
				{ n: 'early-close', score: 4, turnout: 78.5, updatedAt: '2026-10-24T10:00:00Z' }, // same gap 0.5, earlier → ahead
				{ n: 'far', score: 4, turnout: 70, updatedAt: '2026-10-20T10:00:00Z' },
				{ n: 'none', score: 4, turnout: null, updatedAt: '2026-10-19T10:00:00Z' }, // no turnout → after any turnout
				{ n: 'best', score: 2, turnout: null, updatedAt: '2026-10-26T10:00:00Z' }, // better score wins regardless
				{ n: 'worse', score: 9, turnout: 78, updatedAt: '2026-10-19T10:00:00Z' }
			],
			(t) => t.score,
			actual
		);
		expect(r.map((x) => x.item.n)).toEqual(['best', 'early-close', 'late-close', 'far', 'none', 'worse']);
		expect(r.map((x) => x.rank)).toEqual([1, 2, 3, 4, 5, 6]);
		expect(r[1].turnoutGap).toBe(0.5);
		expect(r[4].turnoutGap).toBeNull();
	});
	it('only full ties share a rank', () => {
		const r = rankPredictions(
			[{ n: 'a', score: 3, turnout: 75, updatedAt: 'x' }, { n: 'b', score: 3, turnout: 75, updatedAt: 'x' }],
			(t) => t.score,
			78
		);
		expect(r.map((x) => x.rank)).toEqual([1, 1]);
	});
});
