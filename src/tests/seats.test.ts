import { describe, it, expect } from 'vitest';
import { allocateKnesset } from '../lib/seats';

// 2022 Knesset election, official results (Central Elections Committee, expb.csv summed over all ballot boxes).
// Valid votes per list and the official seats; surplus agreements as signed for that election.
const votes2022: Record<string, number> = {
	likud: 1115336, yeshatid: 847435, rzp: 516470, natunity: 432482, shas: 392964, utj: 280194,
	yb: 213687, raam: 194047, hadash: 178735, labor: 175992, meretz: 150793, balad: 138617,
	jewishhome: 56775, others: 0
};
const seats2022: Record<string, number> = {
	likud: 32, yeshatid: 24, rzp: 14, natunity: 12, shas: 11, utj: 7, yb: 6, raam: 5, hadash: 5, labor: 4, meretz: 0, balad: 0, jewishhome: 0, others: 0
};
const agreements2022: [string, string][] = [['likud', 'rzp'], ['yeshatid', 'natunity'], ['shas', 'utj'], ['labor', 'meretz'], ['raam', 'hadash']];

describe('allocateKnesset', () => {
	it('reproduces the official 2022 seats', () => {
		// the 2022 total also includes small lists under the threshold; add them so the threshold is right
		const lists = Object.entries(votes2022).map(([id, v]) => ({ id, votes: v }));
		lists.push({ id: 'small_lists', votes: 4764742 - Object.values(votes2022).reduce((a, b) => a + b, 0) });
		const out = allocateKnesset(lists, agreements2022);
		for (const [id, s] of Object.entries(seats2022)) expect(out[id], id).toBe(s);
		expect(Object.values(out).reduce((a, b) => a + b, 0)).toBe(120);
	});
	it('drops lists under 3.25% and still gives out 120', () => {
		const out = allocateKnesset([{ id: 'a', votes: 600 }, { id: 'b', votes: 370 }, { id: 'c', votes: 30 }], []);
		expect(out.c).toBe(0);
		expect(out.a + out.b).toBe(120);
	});
});
