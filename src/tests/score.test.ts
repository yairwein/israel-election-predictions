import { describe, it, expect } from 'vitest';
import { seatError, rankByScore } from '../lib/score';

describe('leaderboard scoring', () => {
	it('sums absolute seat differences', () => {
		expect(seatError({ a: 30, b: 20 }, { a: 28, b: 23 }, ['a', 'b'])).toBe(5);
		expect(seatError({ a: 30 }, { a: 30, b: 0 }, ['a', 'b'])).toBe(0);
	});
	it('ranks with shared ranks for ties, earlier save first', () => {
		const r = rankByScore(
			[{ n: 'x', updatedAt: '2' }, { n: 'y', updatedAt: '1' }, { n: 'z', updatedAt: '3' }, { n: 'w', updatedAt: '4' }],
			(t) => ({ x: 4, y: 4, z: 9, w: 2 })[t.n]!
		);
		expect(r.map((x) => [x.item.n, x.rank])).toEqual([['w', 1], ['y', 2], ['x', 2], ['z', 4]]);
	});
});
