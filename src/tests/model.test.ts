import { describe, it, expect } from 'vitest';
import { computeAggregate, allocate, wilson, quantile, mean, stdev } from '../lib/model';
import { POLL_AVERAGE, PARTY_IDS, TOTAL_SEATS, emptySeats, type Seats } from '../lib/parties';

function knesset(over: Partial<Seats>): Seats {
	return { ...emptySeats(), ...over } as Seats;
}

// 62 with Amcha, 58 without; opposition 52 / 56; Arab 6.
const coalWithAmcha = knesset({ likud: 30, shas: 9, otzma: 8, rzp: 7, utj: 4, amcha: 4, yashar: 20, together: 12, democrats: 8, yb: 6, joint: 6, raam: 0, reservists: 6 });
// Opposition 61 (no Arab parties)
const oppWins = knesset({ likud: 22, shas: 8, otzma: 7, rzp: 0, utj: 7, yashar: 25, together: 15, democrats: 10, yb: 7, reservists: 4, joint: 9, raam: 6 });
// Neither: 54 / 52 / 14 Arab
const neither = knesset({ likud: 25, shas: 8, otzma: 8, rzp: 5, utj: 8, yashar: 22, together: 13, democrats: 10, yb: 7, joint: 8, raam: 6 });

describe('fixtures', () => {
	it('are valid knessets', () => {
		for (const k of [coalWithAmcha, oppWins, neither, POLL_AVERAGE]) {
			expect(Object.values(k).reduce((a, b) => a + b, 0)).toBe(TOTAL_SEATS);
		}
	});
});

describe('stats helpers', () => {
	it('mean / stdev / quantile', () => {
		expect(mean([1, 2, 3, 4])).toBe(2.5);
		expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
		expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
		expect(quantile([1, 2, 3, 4], 0.1)).toBeCloseTo(1.3, 5);
	});
	it('wilson interval contains p and stays in [0,1]', () => {
		const ci = wilson(0, 10);
		expect(ci.lo).toBe(0);
		expect(ci.hi).toBeGreaterThan(0.2);
		const ci2 = wilson(50, 100);
		expect(ci2.lo).toBeLessThan(0.5);
		expect(ci2.hi).toBeGreaterThan(0.5);
		expect(ci2.hi - ci2.lo).toBeCloseTo(0.192, 2);
	});
});

describe('allocate', () => {
	it('drops parties under the threshold and sums to 120', () => {
		const out = allocate({ a: 60.4, b: 55.3, c: 3.2, d: 1.1 });
		expect(out.c).toBe(0);
		expect(out.d).toBe(0);
		expect(out.a + out.b).toBe(120);
	});
	it('reproduces the poll average', () => {
		const out = allocate({ ...POLL_AVERAGE });
		expect(out).toEqual(POLL_AVERAGE);
	});
});

describe('computeAggregate', () => {
	it('handles no predictions', () => {
		const a = computeAggregate([]);
		expect(a.n).toBe(0);
		expect(a.turnout).toBeNull();
		expect(a.scenarios[0].coalition.share).toBe(0);
	});

	it('classifies the three bloc outcomes per scenario', () => {
		const a = computeAggregate([{ seats: coalWithAmcha }, { seats: oppWins }, { seats: neither }, { seats: neither }]);
		const withA = a.scenarios.find((s) => s.id === 'with_amcha')!;
		const withoutA = a.scenarios.find((s) => s.id === 'without_amcha')!;

		expect(withA.coalition.count).toBe(1); // 62 incl. Amcha
		expect(withA.opposition.count).toBe(1);
		expect(withA.neither.count).toBe(2);

		expect(withoutA.coalition.count).toBe(0); // 58 without Amcha
		expect(withoutA.opposition.count).toBe(1); // only oppWins (61); Amcha is not added to the opposition
		expect(withoutA.neither.count).toBe(3);
		expect(withoutA.unalignedSeats.mean).toBe(1); // Amcha 4 in one of 4 predictions
		expect(withA.unalignedSeats.mean).toBe(0);

		for (const sc of a.scenarios) {
			expect(sc.coalition.share + sc.opposition.share + sc.neither.share).toBeCloseTo(1, 10);
		}
	});

	it('never counts Amcha in the opposition', () => {
		// Opposition 57 + Amcha 4 = 61: must NOT count as an opposition majority without Amcha.
		const k = knesset({ likud: 25, shas: 8, otzma: 7, rzp: 5, utj: 7, amcha: 4, yashar: 24, together: 14, democrats: 9, yb: 6, reservists: 4, joint: 7 });
		expect(Object.values(k).reduce((a, b) => a + b, 0)).toBe(120);
		const a = computeAggregate([{ seats: k }]);
		const withoutA = a.scenarios.find((s) => s.id === 'without_amcha')!;
		expect(withoutA.oppositionSeats.mean).toBe(57);
		expect(withoutA.opposition.count).toBe(0);
		expect(withoutA.neither.count).toBe(1);
		expect(withoutA.unalignedSeats.mean).toBe(4);
	});

	it('computes party means, margins and turnout', () => {
		const a = computeAggregate([
			{ seats: coalWithAmcha, turnout: 70 },
			{ seats: oppWins, turnout: 72 },
			{ seats: neither, turnout: null }
		]);
		const likud = a.parties.find((p) => p.id === 'likud')!;
		expect(likud.mean).toBeCloseTo((30 + 22 + 25) / 3, 10);
		expect(likud.margin).toBeGreaterThan(0);
		expect(a.turnout?.n).toBe(2);
		expect(a.turnout?.mean).toBe(71);
		expect(Object.values(a.meanAllocation).reduce((x, y) => x + y, 0)).toBe(120);
		expect(a.parties.map((p) => p.id)).toEqual(PARTY_IDS);
	});
});


describe('Noam', () => {
	it('counts in the Netanyahu bloc in both views', () => {
		const k = knesset({ likud: 25, shas: 8, otzma: 7, rzp: 5, noam: 4, utj: 7, yashar: 24, together: 14, democrats: 9, yb: 6, raam: 4, joint: 7 });
		expect(Object.values(k).reduce((a, b) => a + b, 0)).toBe(120);
		const a = computeAggregate([{ seats: k }]);
		for (const sc of a.scenarios) expect(sc.coalitionSeats.mean).toBe(56);
	});
	it('older predictions without a noam field count it as 0', () => {
		const { noam, ...old } = POLL_AVERAGE;
		const a = computeAggregate([{ seats: old as Seats }]);
		expect(a.parties.find((p) => p.id === 'noam')!.mean).toBe(0);
		expect(a.scenarios[0].coalitionSeats.mean).toBe(55);
	});
});

import { trimmed, trimmedMargin, TRIM } from '../lib/model';
describe('trimmed mean (extremes set aside)', () => {
	it('drops 10% at each end once there are 10+ values', () => {
		const xs = [20, 21, 21, 22, 22, 22, 23, 23, 24, 40]; // one troll at 40
		expect(trimmed(xs).mean).toBeCloseTo((21 + 21 + 22 + 22 + 22 + 23 + 23 + 24) / 8, 10);
		expect(trimmed(xs).kept).toHaveLength(8);
		expect(TRIM).toBe(0.1);
	});
	it('keeps everything with fewer than 10 values', () => {
		expect(trimmed([1, 2, 30]).mean).toBe(11);
	});
	it('a single extreme prediction moves the plain mean but barely the trimmed one', () => {
		const honest = Array.from({ length: 99 }, (_, i) => 20 + (i % 5));
		const withTroll = [...honest, 40];
		const plainShift = mean(withTroll) - mean(honest);
		const trimShift = trimmed(withTroll).mean - trimmed(honest).mean;
		expect(plainShift).toBeGreaterThan(0.15);
		expect(Math.abs(trimShift)).toBeLessThan(0.05);
	});
	it('has a sensible margin', () => {
		const xs = Array.from({ length: 100 }, (_, i) => 20 + (i % 5));
		const m = trimmedMargin(xs);
		expect(m).toBeGreaterThan(0);
		expect(m).toBeLessThan(1);
		expect(trimmedMargin([5])).toBe(0);
	});
	it('the aggregate exposes both views', () => {
		const a = computeAggregate([{ seats: POLL_AVERAGE, turnout: 70 }, { seats: POLL_AVERAGE, turnout: 72 }]);
		const likud = a.parties.find((p) => p.id === 'likud')!;
		expect(likud.full.mean).toBe(POLL_AVERAGE.likud);
		expect(likud.mean).toBe(POLL_AVERAGE.likud);
		expect(a.turnout?.full.mean).toBe(71);
		expect(Object.values(a.fullAllocation).reduce((x, y) => x + y, 0)).toBe(120);
	});
});
