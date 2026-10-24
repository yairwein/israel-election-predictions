import { describe, it, expect } from 'vitest';
import { partyOrder } from '../lib/order';
import { PARTY_IDS } from '../lib/parties';

describe('partyOrder', () => {
	it('is a permutation of all parties', () => {
		const o = partyOrder('abc123', PARTY_IDS);
		expect([...o].sort()).toEqual([...PARTY_IDS].sort());
	});

	it('is the same for the same person every time (updates keep the order)', () => {
		expect(partyOrder('person-1', PARTY_IDS)).toEqual(partyOrder('person-1', PARTY_IDS));
	});

	it('differs between people', () => {
		const orders = new Set(Array.from({ length: 50 }, (_, i) => partyOrder(`p${i}`, PARTY_IDS).join(',')));
		expect(orders.size).toBe(50);
	});

	it('puts every party first about equally often', () => {
		const N = 14000;
		const first = new Map<string, number>();
		for (let i = 0; i < N; i++) {
			const id = partyOrder(`seed-${i}`, PARTY_IDS)[0];
			first.set(id, (first.get(id) ?? 0) + 1);
		}
		const expected = N / PARTY_IDS.length;
		for (const id of PARTY_IDS) {
			const share = (first.get(id) ?? 0) / expected;
			expect(share).toBeGreaterThan(0.85);
			expect(share).toBeLessThan(1.15);
		}
	});

	it('adding a party later keeps everyone else in the same relative order', () => {
		const before = partyOrder('person-7', PARTY_IDS.filter((id) => id !== 'noam'));
		const after = partyOrder('person-7', PARTY_IDS).filter((id) => id !== 'noam');
		expect(after).toEqual(before);
	});
});
